import { revalidatePath } from "next/cache";

import { z } from "zod";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

const publishSchema = z.object({ rightsConfirmed: z.literal(true) });

type RouteContext = { params: Promise<{ courseId: string }> };

function normalizeCourseCode(code: string) {
  return code.toLocaleUpperCase("en-US").replace(/[^A-Z0-9]/g, "");
}

function deriveTerm(termName: string | null, termStart: string | null) {
  const source = termName?.toLocaleLowerCase("en-US") ?? "";
  const period = ["winter", "spring", "summer", "fall"].find((value) =>
    source.includes(value),
  );
  const yearMatch = source.match(/(?:19|20|21)\d{2}/);
  return {
    period: period ?? (source ? "other" : null),
    year: yearMatch
      ? Number(yearMatch[0])
      : termStart
        ? Number(termStart.slice(0, 4))
        : null,
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to publish a course.", 401);
  }

  const parsed = publishSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      "RIGHTS_CONFIRMATION_REQUIRED",
      "Confirm that you have permission to share the syllabus and course information.",
      400,
    );
  }

  const { courseId } = await params;
  const { data: course, error: courseError } = await session.supabase
    .from("courses")
    .select(
      "id,code,title,section,term_name,term_start,term_end,time_zone,status,institution_id,calendar_events(title,event_type,starts_at,ends_at,start_date,end_date,is_all_day,time_zone,location,rrule,status),grading_categories(name,weight_percent,aggregation_mode,is_complete,display_order),grading_policies(kind,description,calculator_support),course_people(name,role),syllabus_sources(storage_path,original_name,mime_type,sha256,size_bytes,page_count,processing_status,created_at)",
    )
    .eq("id", courseId)
    .eq("owner_id", session.userId)
    .maybeSingle();

  if (courseError) {
    return errorResponse(
      "COURSE_LOOKUP_FAILED",
      "We couldn’t prepare this course for publishing. Try again.",
      500,
    );
  }
  if (!course) return errorResponse("NOT_FOUND", "Course not found.", 404);
  if (course.status !== "active") {
    return errorResponse(
      "COURSE_NOT_READY",
      "Finish reviewing and activate the course before publishing it.",
      409,
    );
  }
  if (!course.institution_id) {
    return errorResponse(
      "INSTITUTION_REQUIRED",
      "Choose the course’s school before publishing it.",
      409,
    );
  }
  if (!course.code?.trim() || !course.title?.trim()) {
    return errorResponse(
      "COURSE_IDENTITY_REQUIRED",
      "Add a course number and name before publishing it.",
      409,
    );
  }

  const source = [...(course.syllabus_sources ?? [])]
    .filter(
      (item) =>
        item.processing_status === "parsed" && Boolean(item.storage_path),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!source?.storage_path) {
    return errorResponse(
      "PARSED_PDF_REQUIRED",
      "A successfully parsed syllabus PDF is required before publishing.",
      409,
    );
  }

  const { data: profile, error: profileError } = await session.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", session.userId)
    .maybeSingle();
  if (profileError) {
    return errorResponse(
      "PROFILE_LOOKUP_FAILED",
      "We couldn’t prepare your contributor profile. Try again.",
      500,
    );
  }

  const { data: existing, error: publicationLookupError } =
    await session.supabase
      .from("community_publications")
      .select("id,snapshot_version")
      .eq("source_course_id", course.id)
      .eq("owner_id", session.userId)
      .maybeSingle();
  if (publicationLookupError) {
    return errorResponse(
      "PUBLICATION_LOOKUP_FAILED",
      "We couldn’t check this course’s publication. Try again.",
      500,
    );
  }
  const term = deriveTerm(course.term_name, course.term_start);
  const snapshot = {
    source_course_id: course.id,
    owner_id: session.userId,
    institution_id: course.institution_id,
    course_code: course.code.trim(),
    normalized_course_code: normalizeCourseCode(course.code),
    course_title: course.title.trim(),
    section: course.section,
    term_name: course.term_name,
    term_year: term.year,
    term_period: term.period,
    term_start: course.term_start,
    term_end: course.term_end,
    time_zone: course.time_zone,
    contributor_display_name: profile?.display_name?.trim() || "Student",
    calendar_events: course.calendar_events ?? [],
    grading_categories: course.grading_categories ?? [],
    grading_policies: course.grading_policies ?? [],
    course_people: course.course_people ?? [],
    source_storage_path: source.storage_path,
    source_original_name: source.original_name,
    source_mime_type: source.mime_type,
    source_sha256: source.sha256,
    source_size_bytes: source.size_bytes,
    source_page_count: source.page_count,
    snapshot_version: (existing?.snapshot_version ?? 0) + 1,
    publication_status: "published" as const,
    rights_confirmed_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  };

  const query = existing
    ? session.supabase
        .from("community_publications")
        .update(snapshot)
        .eq("id", existing.id)
        .eq("owner_id", session.userId)
    : session.supabase.from("community_publications").insert(snapshot);
  const { data: publication, error: publicationError } = await query
    .select("id,publication_status,snapshot_version,published_at")
    .single();

  if (publicationError || !publication) {
    return errorResponse(
      "PUBLICATION_FAILED",
      "We couldn’t publish this course. Your private workspace is unchanged.",
      500,
    );
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/community");
  revalidatePath(`/community/${publication.id}`);

  return Response.json(
    { publication },
    {
      status: existing ? 200 : 201,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to unpublish a course.", 401);
  }

  const { courseId } = await params;
  const { data: publication, error } = await session.supabase
    .from("community_publications")
    .update({ publication_status: "hidden" })
    .eq("source_course_id", courseId)
    .eq("owner_id", session.userId)
    .select("id,publication_status")
    .maybeSingle();
  if (error) {
    return errorResponse(
      "UNPUBLISH_FAILED",
      "We couldn’t remove this course from the community. Try again.",
      500,
    );
  }
  if (!publication) {
    return errorResponse("NOT_FOUND", "Published course not found.", 404);
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/community");
  revalidatePath(`/community/${publication.id}`);
  return Response.json(
    { publication },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
