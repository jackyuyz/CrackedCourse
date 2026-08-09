import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";
import { extractionItems } from "@/lib/extraction/items";
import { getSyllabusExtractor } from "@/lib/extraction/provider";
import { syllabusExtractionV1Schema } from "@/lib/extraction/schema";
import { validateGradingWeightTotal } from "@/lib/extraction/validate";
import { parsePdf } from "@/lib/pdf/parse";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ courseId: string }> };

const LATEST_EXTRACTION_PROVIDER = "heuristic";
const LATEST_EXTRACTION_MODEL = "heuristic-v2";

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to extract a syllabus.", 401);
  }

  const { courseId } = await params;
  const { data: course } = await session.supabase
    .from("courses")
    .select("id,term_name,term_start,term_end,time_zone,status")
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (!course)
    return errorResponse("NOT_FOUND", "Course draft not found.", 404);

  const { data: source } = await session.supabase
    .from("syllabus_sources")
    .select("id,storage_path")
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!source?.storage_path) {
    return errorResponse(
      "NOT_FOUND",
      "Upload a syllabus before starting extraction.",
      404,
    );
  }

  const provider = LATEST_EXTRACTION_PROVIDER;
  const model = LATEST_EXTRACTION_MODEL;
  let existingRunQuery = session.supabase
    .from("extraction_runs")
    .select("id,status,provider,model,created_at")
    .eq("source_id", source.id)
    .eq("course_id", courseId)
    .eq("owner_id", session.userId)
    .in("status", ["succeeded", "partial"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (course.status !== "active") {
    existingRunQuery = existingRunQuery
      .eq("provider", provider)
      .eq("model", model);
  }

  const { data: existingRun, error: existingRunError } =
    await existingRunQuery.maybeSingle();
  if (existingRunError) {
    return errorResponse(
      "EXTRACTION_LOOKUP_FAILED",
      "We couldn’t check the existing syllabus analysis. Try again.",
      500,
    );
  }
  if (existingRun) {
    return Response.json(
      {
        runId: existingRun.id,
        status: existingRun.status,
        provider: existingRun.provider,
        model: existingRun.model,
        reused: true,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const { data: run, error: runError } = await session.supabase
    .from("extraction_runs")
    .insert({
      source_id: source.id,
      course_id: courseId,
      owner_id: session.userId,
      status: "queued",
      schema_version: "1",
      provider,
      model,
      prompt_version: "syllabus-v1",
    })
    .select("id")
    .single();

  if (runError || !run) {
    return errorResponse(
      "EXTRACTION_START_FAILED",
      "We couldn’t start extraction. Try again.",
      500,
    );
  }

  await Promise.all([
    session.supabase
      .from("extraction_runs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", run.id),
    session.supabase
      .from("syllabus_sources")
      .update({
        processing_status: "parsing",
        failure_code: null,
        failure_message: null,
      })
      .eq("id", source.id),
  ]);

  try {
    const { data: pdf, error: downloadError } = await session.supabase.storage
      .from("syllabi")
      .download(source.storage_path);
    if (downloadError || !pdf) throw new Error("PDF_DOWNLOAD_FAILED");

    const parsedPdf = await parsePdf(await pdf.arrayBuffer());
    if (parsedPdf.usefulCharacterCount < 100) {
      await Promise.all([
        session.supabase
          .from("syllabus_sources")
          .update({
            processing_status: "unsupported",
            page_count: parsedPdf.pageCount,
            failure_code: "LIKELY_SCANNED_PDF",
            failure_message:
              "The document contains too little extractable text.",
          })
          .eq("id", source.id),
        session.supabase
          .from("extraction_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_code: "LIKELY_SCANNED_PDF",
            error_message: "The document contains too little extractable text.",
          })
          .eq("id", run.id),
      ]);
      return errorResponse(
        "LIKELY_SCANNED_PDF",
        "This PDF looks scanned. Replace it or create the course manually.",
        422,
        { runId: run.id },
      );
    }

    const pageRows = parsedPdf.pages.map((page) => ({
      source_id: source.id,
      page_number: page.pageNumber,
      text: page.text,
    }));
    const { error: pagesError } = await session.supabase
      .from("source_pages")
      .upsert(pageRows, { onConflict: "source_id,page_number" });
    if (pagesError) throw new Error("SOURCE_PAGES_SAVE_FAILED");

    await session.supabase
      .from("syllabus_sources")
      .update({ processing_status: "parsed", page_count: parsedPdf.pageCount })
      .eq("id", source.id);

    const extractor = getSyllabusExtractor(provider);
    const extraction = syllabusExtractionV1Schema.parse(
      await extractor.extract({
        sourceId: source.id,
        pages: parsedPdf.pages,
        assumedTerm: {
          name: course.term_name ?? undefined,
          startDate: course.term_start ?? undefined,
          endDate: course.term_end ?? undefined,
          timeZone: course.time_zone,
        },
      }),
    );
    const items = extractionItems(extraction, parsedPdf.pages);
    const weightCheck = validateGradingWeightTotal(
      extraction.gradingCategories.map(
        (category) => category.value.weightPercent,
      ),
    );
    const warnings = [...extraction.warnings];

    if (extraction.gradingCategories.length > 0 && !weightCheck.isValid) {
      warnings.push({
        code: "INVALID_GRADING_WEIGHTS",
        message: `Known grading weights total ${weightCheck.total.toFixed(1)}%.`,
        severity: "blocking",
      });
    }
    if (items.some((item) => !item.evidenceMatched)) {
      warnings.push({
        code: "EVIDENCE_NOT_FOUND",
        message:
          "One or more source quotations could not be verified and need review.",
        severity: "review",
      });
    }

    if (items.length > 0) {
      const { error: itemError } = await session.supabase
        .from("extraction_items")
        .insert(
          items.map((item) => ({
            run_id: run.id,
            course_id: courseId,
            owner_id: session.userId,
            item_type: item.itemType,
            original_payload: item.originalPayload,
            current_payload: item.currentPayload,
            confidence: item.confidence,
            confidence_label: item.confidenceLabel,
            evidence: item.evidence,
            review_status: "pending",
          })),
        );
      if (itemError) throw new Error("EXTRACTION_ITEMS_SAVE_FAILED");
    }

    const partial =
      items.length === 0 ||
      warnings.some((warning) => warning.severity === "blocking");
    await session.supabase
      .from("extraction_runs")
      .update({
        status: partial ? "partial" : "succeeded",
        raw_result: extraction,
        validation_warnings: warnings,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return Response.json(
      {
        runId: run.id,
        status: partial ? "partial" : "succeeded",
        itemCount: items.length,
        warningCount: warnings.length,
        provider,
        model,
        reused: false,
      },
      { status: 200 },
    );
  } catch (caught) {
    const code = caught instanceof Error ? caught.message : "EXTRACTION_FAILED";
    console.error("Syllabus extraction failed", {
      courseId,
      sourceId: source.id,
      runId: run.id,
      code,
      cause: caught,
    });
    await Promise.all([
      session.supabase
        .from("extraction_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_code: code,
          error_message: "The syllabus could not be prepared for review.",
        })
        .eq("id", run.id),
      session.supabase
        .from("syllabus_sources")
        .update({
          processing_status: "failed",
          failure_code: code,
          failure_message: "The syllabus could not be prepared for review.",
        })
        .eq("id", source.id),
    ]);

    const publicErrors: Record<string, { code: string; message: string }> = {
      PDF_DOWNLOAD_FAILED: {
        code: "PDF_DOWNLOAD_FAILED",
        message: "We couldn’t retrieve the saved PDF. Try again.",
      },
      SOURCE_PAGES_SAVE_FAILED: {
        code: "SOURCE_PAGES_SAVE_FAILED",
        message: "We read the PDF but couldn’t save its pages. Try again.",
      },
      EXTRACTION_ITEMS_SAVE_FAILED: {
        code: "EXTRACTION_ITEMS_SAVE_FAILED",
        message:
          "We extracted the syllabus but couldn’t save the review. Try again.",
      },
      EXTRACTION_SCHEMA_INVALID: {
        code: "EXTRACTION_SCHEMA_INVALID",
        message: "The extracted syllabus needs another pass. Try again.",
      },
    };
    const publicError = publicErrors[code] ?? {
      code: "PDF_PARSE_FAILED",
      message: "We couldn’t read this PDF. Replace it or try again.",
    };

    return errorResponse(publicError.code, publicError.message, 422, {
      runId: run.id,
    });
  }
}
