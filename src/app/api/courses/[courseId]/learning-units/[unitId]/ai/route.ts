import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import {
  defaultLearningGuideSources,
  learningGuideSourceFingerprint,
  type LearningGuideMaterialRow,
  type LearningGuideNoteRow,
} from "@/lib/learning-guide-cache";
import {
  LEARNING_ASSISTANT_MODEL,
  LEARNING_ASSISTANT_PROMPT_VERSION,
  learningAssistantRequestSchema,
  noteChunks,
  pdfPageChunks,
  selectRelevantChunks,
  validateAndBuildCitations,
  type LearningAssistantCitation,
  type LearningAssistantRequest,
  type LearningSourceChunk,
} from "@/lib/learning-ai";
import { generateLearningAssistantOutput } from "@/lib/openai/learning-assistant";
import { parsePdf } from "@/lib/pdf/parse";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ courseId: string; unitId: string }>;
};

type ApiSession = NonNullable<Awaited<ReturnType<typeof getApiSession>>>;
type NoteRow = LearningGuideNoteRow;
type MaterialRow = LearningGuideMaterialRow;

type StoredOutputRow = {
  id: string;
  action: LearningAssistantRequest["action"];
  status: "running" | "succeeded" | "failed";
  answer_markdown: string | null;
  practice_items: Array<{
    question: string;
    answerMarkdown: string;
    citationChunkIds: string[];
  }>;
  citations: LearningAssistantCitation[];
  insufficiency: string | null;
  model: string;
  source_selection: LearningAssistantRequest["sources"];
  source_fingerprint: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

const outputFields = [
  "id",
  "action",
  "status",
  "answer_markdown",
  "practice_items",
  "citations",
  "insufficiency",
  "model",
  "source_selection",
  "source_fingerprint",
  "error_message",
  "created_at",
  "completed_at",
].join(",");

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function databaseNeedsMigration(error: unknown) {
  return ["42P01", "42703"].includes(databaseErrorCode(error) ?? "");
}

function migrationError() {
  return errorResponse(
    "LEARNING_AI_NOT_MIGRATED",
    "The Learning Assistant database needs the latest guide-cache migration before this feature can run.",
    503,
  );
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

function serializeOutput(output: StoredOutputRow) {
  return {
    id: output.id,
    action: output.action,
    answerMarkdown: output.answer_markdown ?? "",
    practiceItems: output.practice_items ?? [],
    citations: output.citations ?? [],
    insufficiency: output.insufficiency,
    model: output.model,
    sourceCount: output.source_selection?.length ?? 0,
    completedAt: output.completed_at,
  };
}

async function loadOwnedCourseAndUnit(
  session: ApiSession,
  courseId: string,
  unitId: string,
) {
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
  return { course, unit };
}

async function loadDefaultGuideRows(
  session: ApiSession,
  courseId: string,
  unitId: string,
) {
  const [notesResult, materialsResult] = await Promise.all([
    session.supabase
      .from("learning_unit_notes")
      .select("id,visibility,body_markdown,updated_at")
      .eq("learning_unit_id", unitId)
      .eq("owner_id", session.userId),
    session.supabase
      .from("course_materials")
      .select(
        "id,title,storage_path,material_type,kind,size_bytes,updated_at,display_order",
      )
      .eq("course_id", courseId)
      .eq("learning_unit_id", unitId)
      .eq("owner_id", session.userId)
      .eq("is_hidden", false)
      .eq("kind", "file")
      .eq("material_type", "pdf")
      .order("display_order")
      .limit(3),
  ]);
  return {
    notes: (notesResult.data ?? []) as NoteRow[],
    materials: (materialsResult.data ?? []) as MaterialRow[],
    error: notesResult.error ?? materialsResult.error,
  };
}

async function findGuideOutput(
  session: ApiSession,
  unitId: string,
  fingerprint: string,
) {
  return session.supabase
    .from("learning_unit_ai_outputs")
    .select(outputFields)
    .eq("owner_id", session.userId)
    .eq("learning_unit_id", unitId)
    .eq("action", "summary")
    .eq("source_fingerprint", fingerprint)
    .eq("prompt_version", LEARNING_ASSISTANT_PROMPT_VERSION)
    .maybeSingle();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to use the Learning Assistant.",
      401,
    );
  }

  const { courseId, unitId } = await params;
  const { course, unit } = await loadOwnedCourseAndUnit(
    session,
    courseId,
    unitId,
  );
  if (!course || !unit) {
    return errorResponse("NOT_FOUND", "Learning unit not found.", 404);
  }

  const {
    notes,
    materials,
    error: sourceError,
  } = await loadDefaultGuideRows(session, courseId, unitId);
  if (sourceError) {
    return errorResponse(
      "AI_SOURCE_LOOKUP_FAILED",
      "We couldn’t check this unit’s learning sources. Try again.",
      500,
    );
  }
  const defaultSources = defaultLearningGuideSources(notes, materials);
  if (!defaultSources.length) {
    return Response.json(
      { guide: null, state: "empty", defaultSources },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const fingerprint = learningGuideSourceFingerprint({ notes, materials });
  const { data: exactOutput, error: exactError } = await findGuideOutput(
    session,
    unitId,
    fingerprint,
  );
  if (databaseNeedsMigration(exactError)) return migrationError();
  if (exactError) {
    return errorResponse(
      "AI_LOOKUP_FAILED",
      "We couldn’t load the saved study guide. Try again.",
      500,
    );
  }
  if (exactOutput) {
    const stored = exactOutput as unknown as StoredOutputRow;
    const stillGenerating =
      stored.status === "running" &&
      Date.now() - new Date(stored.created_at).getTime() < 90_000;
    return Response.json(
      {
        guide: stored.status === "succeeded" ? serializeOutput(stored) : null,
        state:
          stored.status === "succeeded"
            ? "current"
            : stillGenerating
              ? "generating"
              : "failed",
        defaultSources,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data: previousOutput, error: previousError } = await session.supabase
    .from("learning_unit_ai_outputs")
    .select(outputFields)
    .eq("owner_id", session.userId)
    .eq("learning_unit_id", unitId)
    .eq("action", "summary")
    .eq("status", "succeeded")
    .not("source_fingerprint", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (databaseNeedsMigration(previousError)) return migrationError();
  if (previousError) {
    return errorResponse(
      "AI_LOOKUP_FAILED",
      "We couldn’t load the saved study guide. Try again.",
      500,
    );
  }

  return Response.json(
    {
      guide: previousOutput
        ? serializeOutput(previousOutput as unknown as StoredOutputRow)
        : null,
      state: previousOutput ? "stale" : "missing",
      defaultSources,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
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
  if (!session) {
    return errorResponse(
      "UNAUTHORIZED",
      "Sign in to use the Learning Assistant.",
      401,
    );
  }
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
  const { course, unit } = await loadOwnedCourseAndUnit(
    session,
    courseId,
    unitId,
  );
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
        .select("id,visibility,body_markdown,updated_at")
        .eq("learning_unit_id", unitId)
        .eq("owner_id", session.userId)
        .in("visibility", noteVisibilities)
    : Promise.resolve({ data: [] as NoteRow[], error: null });
  const materialsPromise = materialIds.length
    ? session.supabase
        .from("course_materials")
        .select(
          "id,title,storage_path,material_type,kind,size_bytes,updated_at,display_order",
        )
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

  const sourceFingerprint =
    parsedRequest.data.intent === "unit-guide"
      ? learningGuideSourceFingerprint({ notes, materials })
      : null;
  let existingOutput: StoredOutputRow | null = null;
  if (sourceFingerprint) {
    const { data, error } = await findGuideOutput(
      session,
      unitId,
      sourceFingerprint,
    );
    if (databaseNeedsMigration(error)) return migrationError();
    if (error) {
      return errorResponse(
        "AI_LOOKUP_FAILED",
        "We couldn’t check the saved study guide. Try again.",
        500,
      );
    }
    existingOutput = (data as unknown as StoredOutputRow | null) ?? null;
    if (existingOutput?.status === "succeeded") {
      return Response.json(
        { output: serializeOutput(existingOutput), cached: true },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (
      existingOutput?.status === "running" &&
      Date.now() - new Date(existingOutput.created_at).getTime() < 90_000
    ) {
      return Response.json(
        { status: "running" },
        {
          status: 202,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await session.supabase
    .from("learning_unit_ai_outputs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", session.userId)
    .gte("created_at", oneHourAgo);
  if (databaseNeedsMigration(countError)) return migrationError();
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

  const outputValues = {
    course_id: courseId,
    learning_unit_id: unitId,
    owner_id: session.userId,
    action: parsedRequest.data.action,
    status: "running",
    prompt: parsedRequest.data.question,
    source_selection: parsedRequest.data.sources,
    source_fingerprint: sourceFingerprint,
    provider: "openai",
    model: LEARNING_ASSISTANT_MODEL,
    prompt_version: LEARNING_ASSISTANT_PROMPT_VERSION,
    answer_markdown: null,
    practice_items: [],
    citations: [],
    insufficiency: null,
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  } as const;
  const outputResult = existingOutput
    ? await session.supabase
        .from("learning_unit_ai_outputs")
        .update(outputValues)
        .eq("id", existingOutput.id)
        .eq("owner_id", session.userId)
        .select("id")
        .single()
    : await session.supabase
        .from("learning_unit_ai_outputs")
        .insert(outputValues)
        .select("id")
        .single();
  if (outputResult.error || !outputResult.data) {
    const code = databaseErrorCode(outputResult.error);
    if (databaseNeedsMigration(outputResult.error)) return migrationError();
    if (code === "23505" && sourceFingerprint) {
      const { data } = await findGuideOutput(
        session,
        unitId,
        sourceFingerprint,
      );
      const duplicate = data as unknown as StoredOutputRow | null;
      if (duplicate?.status === "succeeded") {
        return Response.json(
          { output: serializeOutput(duplicate), cached: true },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }
      return Response.json(
        { status: "running" },
        {
          status: 202,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    return errorResponse(
      "AI_START_FAILED",
      "We couldn’t start the Learning Assistant. Try again.",
      500,
    );
  }
  const outputId = outputResult.data.id;

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
      if (parsedPdf.usefulCharacterCount < 100) {
        throw new Error("AI_PDF_UNREADABLE");
      }
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
    const completedAt = new Date().toISOString();
    const { error: saveError } = await session.supabase
      .from("learning_unit_ai_outputs")
      .update({
        status: "succeeded",
        answer_markdown: generated.answerMarkdown,
        practice_items: generated.practiceItems,
        citations,
        insufficiency: generated.insufficiency,
        completed_at: completedAt,
      })
      .eq("id", outputId)
      .eq("owner_id", session.userId);
    if (saveError) throw new Error("AI_OUTPUT_SAVE_FAILED");

    return Response.json(
      {
        output: {
          id: outputId,
          action: parsedRequest.data.action,
          answerMarkdown: generated.answerMarkdown,
          practiceItems: generated.practiceItems,
          citations,
          insufficiency: generated.insufficiency,
          model: LEARNING_ASSISTANT_MODEL,
          sourceCount: parsedRequest.data.sources.length,
          completedAt,
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
      .eq("id", outputId)
      .eq("owner_id", session.userId);
    console.error("Learning Assistant request failed", {
      courseId,
      unitId,
      outputId,
      code: failure.code,
    });
    return errorResponse(failure.code, failure.message, failure.status);
  }
}
