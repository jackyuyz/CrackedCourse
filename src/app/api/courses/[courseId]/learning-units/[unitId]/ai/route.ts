import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import {
  LEARNING_ASSISTANT_MODEL,
  LEARNING_ASSISTANT_PROMPT_VERSION,
  learningAssistantRequestSchema,
  noteChunks,
  pdfPageChunks,
  selectRelevantChunks,
  validateAndBuildCitations,
  type LearningSourceChunk,
} from "@/lib/learning-ai";
import { generateLearningAssistantOutput } from "@/lib/openai/learning-assistant";
import { parsePdf } from "@/lib/pdf/parse";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ courseId: string; unitId: string }>;
};

type NoteRow = {
  id: string;
  visibility: "public" | "private";
  body_markdown: string;
};

type MaterialRow = {
  id: string;
  title: string;
  storage_path: string | null;
  material_type: "pdf" | "slides" | "link" | "other";
  kind: "file" | "link";
};

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function assistantError(caught: unknown) {
  const code =
    caught instanceof Error ? caught.message : "AI_GENERATION_FAILED";
  const errors: Record<string, { status: number; message: string }> = {
    AI_SOURCE_EMPTY: {
      status: 422,
      message: "One of the selected sources does not contain readable text.",
    },
    AI_SOURCE_NOT_FOUND: {
      status: 404,
      message:
        "One of the selected sources is no longer available in this unit.",
    },
    AI_SOURCE_LIMIT: {
      status: 400,
      message: "Choose no more than three PDF materials for one request.",
    },
    AI_PDF_DOWNLOAD_FAILED: {
      status: 422,
      message: "We couldn’t open one of the selected PDFs. Try it again.",
    },
    AI_PDF_UNREADABLE: {
      status: 422,
      message:
        "One of the selected PDFs has too little readable text. Scanned PDFs are not supported yet.",
    },
    OPENAI_AUTH_FAILED: {
      status: 503,
      message: "The Learning Assistant API key could not be verified.",
    },
    OPENAI_RATE_LIMITED: {
      status: 429,
      message:
        "The Learning Assistant is busy right now. Wait a moment and try again.",
    },
    OPENAI_REQUEST_FAILED: {
      status: 502,
      message:
        "The Learning Assistant could not complete that request. Try again.",
    },
    OPENAI_EMPTY_RESPONSE: {
      status: 502,
      message: "The Learning Assistant returned an empty response. Try again.",
    },
    OPENAI_SCHEMA_INVALID: {
      status: 502,
      message:
        "The Learning Assistant response could not be verified. Try again.",
    },
    AI_CITATION_INVALID: {
      status: 502,
      message:
        "The response cited a source that was not selected, so it was not shown.",
    },
    AI_CITATION_REQUIRED: {
      status: 502,
      message:
        "The response did not include enough source support, so it was not shown.",
    },
    AI_PRACTICE_EMPTY: {
      status: 502,
      message:
        "The Learning Assistant did not create valid practice questions. Try again.",
    },
  };
  return {
    code,
    ...(errors[code] ?? {
      status: 500,
      message: "We couldn’t complete that Learning Assistant request.",
    }),
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "AI_NOT_CONFIGURED",
      "Add OPENAI_API_KEY to the server environment to enable the Learning Assistant.",
      503,
    );
  }

  const session = await getApiSession();
  if (!session)
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to use the Learning Assistant.",
      401,
    );
  const parsedRequest = learningAssistantRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedRequest.success) {
    return errorResponse(
      "INVALID_REQUEST",
      "Choose sources and enter a valid learning request.",
      400,
    );
  }

  const { courseId, unitId } = await params;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await session.supabase
    .from("learning_unit_ai_outputs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", session.userId)
    .gte("created_at", oneHourAgo);
  if (databaseErrorCode(countError) === "42P01") {
    return errorResponse(
      "LEARNING_AI_NOT_MIGRATED",
      "The Learning Assistant database has not been set up yet. Apply migration 20260821022550_learning_assistant_outputs, then try again.",
      503,
    );
  }
  if (countError) {
    return errorResponse(
      "AI_LOOKUP_FAILED",
      "We couldn’t start the Learning Assistant. Try again.",
      500,
    );
  }
  if ((count ?? 0) >= 20) {
    return errorResponse(
      "AI_RATE_LIMITED",
      "You’ve reached the current hourly Learning Assistant limit. Try again later.",
      429,
    );
  }

  const [{ data: course }, { data: unit }] = await Promise.all([
    session.supabase
      .from("courses")
      .select("id,code,title")
      .eq("id", courseId)
      .eq("owner_id", session.userId)
      .maybeSingle(),
    session.supabase
      .from("learning_units")
      .select("id,title")
      .eq("id", unitId)
      .eq("course_id", courseId)
      .eq("owner_id", session.userId)
      .eq("is_hidden", false)
      .maybeSingle(),
  ]);
  if (!course || !unit) {
    return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  }

  const noteVisibilities = parsedRequest.data.sources.flatMap((source) =>
    source.kind === "note" ? [source.visibility] : [],
  );
  const materialIds = parsedRequest.data.sources.flatMap((source) =>
    source.kind === "material" ? [source.materialId] : [],
  );
  if (materialIds.length > 3) {
    return errorResponse(
      "AI_SOURCE_LIMIT",
      "Choose no more than three PDF materials for one request.",
      400,
    );
  }

  const notesPromise = noteVisibilities.length
    ? session.supabase
        .from("learning_unit_notes")
        .select("id,visibility,body_markdown")
        .eq("learning_unit_id", unitId)
        .eq("owner_id", session.userId)
        .in("visibility", noteVisibilities)
    : Promise.resolve({ data: [] as NoteRow[], error: null });
  const materialsPromise = materialIds.length
    ? session.supabase
        .from("course_materials")
        .select("id,title,storage_path,material_type,kind")
        .eq("course_id", courseId)
        .eq("learning_unit_id", unitId)
        .eq("owner_id", session.userId)
        .eq("is_hidden", false)
        .in("id", materialIds)
    : Promise.resolve({ data: [] as MaterialRow[], error: null });
  const [
    { data: noteRows, error: notesError },
    { data: materialRows, error: materialsError },
  ] = await Promise.all([notesPromise, materialsPromise]);
  if (notesError || materialsError) {
    return errorResponse(
      "AI_SOURCE_LOOKUP_FAILED",
      "We couldn’t load the selected sources. Try again.",
      500,
    );
  }

  const notes = (noteRows ?? []) as NoteRow[];
  const materials = (materialRows ?? []) as MaterialRow[];
  if (
    notes.length !== noteVisibilities.length ||
    materials.length !== materialIds.length
  ) {
    return errorResponse(
      "AI_SOURCE_NOT_FOUND",
      "One of the selected sources is no longer available in this unit.",
      404,
    );
  }
  if (
    materials.some(
      (material) =>
        material.kind !== "file" ||
        material.material_type !== "pdf" ||
        !material.storage_path,
    )
  ) {
    return errorResponse(
      "AI_SOURCE_NOT_SUPPORTED",
      "Only text-based PDF materials are supported right now.",
      422,
    );
  }

  const { data: output, error: outputError } = await session.supabase
    .from("learning_unit_ai_outputs")
    .insert({
      course_id: courseId,
      learning_unit_id: unitId,
      owner_id: session.userId,
      action: parsedRequest.data.action,
      status: "running",
      prompt: parsedRequest.data.question,
      source_selection: parsedRequest.data.sources,
      provider: "openai",
      model: LEARNING_ASSISTANT_MODEL,
      prompt_version: LEARNING_ASSISTANT_PROMPT_VERSION,
    })
    .select("id")
    .single();
  if (outputError || !output) {
    const code = databaseErrorCode(outputError);
    if (code === "42P01") {
      return errorResponse(
        "LEARNING_AI_NOT_MIGRATED",
        "The Learning Assistant database has not been set up yet. Apply migration 20260821022550_learning_assistant_outputs, then try again.",
        503,
      );
    }
    return errorResponse(
      "AI_START_FAILED",
      "We couldn’t start the Learning Assistant. Try again.",
      500,
    );
  }

  try {
    const chunks: LearningSourceChunk[] = [];
    for (const selectedSource of parsedRequest.data.sources) {
      if (selectedSource.kind === "note") {
        const note = notes.find(
          (candidate) => candidate.visibility === selectedSource.visibility,
        );
        if (!note?.body_markdown.trim()) throw new Error("AI_SOURCE_EMPTY");
        chunks.push(
          ...noteChunks({
            sourceId: `note:${selectedSource.visibility}`,
            sourceTitle:
              selectedSource.visibility === "private"
                ? "Private note"
                : "Public course note",
            markdown: note.body_markdown,
          }),
        );
        continue;
      }

      const material = materials.find(
        (candidate) => candidate.id === selectedSource.materialId,
      );
      if (!material?.storage_path) throw new Error("AI_SOURCE_NOT_FOUND");
      const { data: file, error: downloadError } =
        await session.supabase.storage
          .from("course-materials")
          .download(material.storage_path);
      if (downloadError || !file) throw new Error("AI_PDF_DOWNLOAD_FAILED");
      const parsedPdf = await parsePdf(await file.arrayBuffer());
      if (parsedPdf.usefulCharacterCount < 100)
        throw new Error("AI_PDF_UNREADABLE");
      chunks.push(
        ...pdfPageChunks({
          sourceId: `material:${material.id}`,
          sourceTitle: material.title,
          pages: parsedPdf.pages,
        }),
      );
    }
    if (chunks.length === 0) throw new Error("AI_SOURCE_EMPTY");

    const retrievalQuery = [
      parsedRequest.data.action,
      parsedRequest.data.question ?? "",
      unit.title,
    ].join(" ");
    const selectedChunks = selectRelevantChunks(chunks, retrievalQuery);
    if (selectedChunks.length === 0) throw new Error("AI_SOURCE_EMPTY");
    const generated = await generateLearningAssistantOutput({
      apiKey,
      request: parsedRequest.data,
      chunks: selectedChunks,
      courseLabel:
        [course.code, course.title].filter(Boolean).join(" — ") || "Course",
      unitTitle: unit.title,
    });
    const citations = validateAndBuildCitations(
      generated,
      selectedChunks,
      parsedRequest.data.action,
    );
    const { error: saveError } = await session.supabase
      .from("learning_unit_ai_outputs")
      .update({
        status: "succeeded",
        answer_markdown: generated.answerMarkdown,
        practice_items: generated.practiceItems,
        citations,
        completed_at: new Date().toISOString(),
      })
      .eq("id", output.id)
      .eq("owner_id", session.userId);
    if (saveError) throw new Error("AI_OUTPUT_SAVE_FAILED");

    return Response.json(
      {
        output: {
          id: output.id,
          action: parsedRequest.data.action,
          answerMarkdown: generated.answerMarkdown,
          practiceItems: generated.practiceItems,
          citations,
          insufficiency: generated.insufficiency,
          model: LEARNING_ASSISTANT_MODEL,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (caught) {
    const failure = assistantError(caught);
    await session.supabase
      .from("learning_unit_ai_outputs")
      .update({
        status: "failed",
        error_code: failure.code,
        error_message: failure.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", output.id)
      .eq("owner_id", session.userId);
    console.error("Learning Assistant request failed", {
      courseId,
      unitId,
      outputId: output.id,
      code: failure.code,
    });
    return errorResponse(failure.code, failure.message, failure.status);
  }
}
