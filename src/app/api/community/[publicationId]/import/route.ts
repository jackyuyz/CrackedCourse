import { revalidatePath } from "next/cache";

import { errorResponse } from "@/lib/api/errors";
import { getApiSession } from "@/lib/auth/api";

type RouteContext = { params: Promise<{ publicationId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getApiSession();
  if (!session) {
    return errorResponse("UNAUTHORIZED", "Sign in to import a course.", 401);
  }
  const { publicationId } = await params;
  const { data: publication, error: publicationError } = await session.supabase
    .from("community_publications")
    .select(
      "id,owner_id,institution_id,course_code,course_title,section,term_name,term_start,term_end,time_zone,calendar_events,grading_categories,grading_policies,course_people,source_storage_path,source_original_name,source_mime_type,source_sha256,source_size_bytes,source_page_count",
    )
    .eq("id", publicationId)
    .eq("publication_status", "published")
    .maybeSingle();
  if (publicationError || !publication) {
    return errorResponse("NOT_FOUND", "Published course not found.", 404);
  }
  if (publication.owner_id === session.userId) {
    return errorResponse(
      "OWN_PUBLICATION",
      "This publication already belongs to your workspace.",
      409,
    );
  }

  const { data: previousImport } = await session.supabase
    .from("community_imports")
    .select("course_id")
    .eq("publication_id", publicationId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (previousImport) {
    return Response.json(
      { courseId: previousImport.course_id, reused: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data: duplicateSource } = await session.supabase
    .from("syllabus_sources")
    .select("course_id")
    .eq("owner_id", session.userId)
    .eq("sha256", publication.source_sha256)
    .maybeSingle();
  if (duplicateSource) {
    return errorResponse(
      "SYLLABUS_ALREADY_SAVED",
      "This syllabus is already saved in one of your courses.",
      409,
      { courseId: duplicateSource.course_id },
    );
  }

  const { data: course, error: courseError } = await session.supabase
    .from("courses")
    .insert({
      owner_id: session.userId,
      institution_id: publication.institution_id,
      imported_from_publication_id: publication.id,
      code: publication.course_code,
      title: publication.course_title,
      section: publication.section,
      term_name: publication.term_name,
      term_start: publication.term_start,
      term_end: publication.term_end,
      time_zone: publication.time_zone,
      color_key: "ocean",
      status: "active",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (courseError || !course) {
    return errorResponse(
      "IMPORT_FAILED",
      "We couldn’t create your private copy. Try again.",
      500,
    );
  }

  const safeName = publication.source_original_name.replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );
  const destinationPath = `${session.userId}/${course.id}/${safeName}`;
  const { error: copyError } = await session.supabase.storage
    .from("syllabi")
    .copy(publication.source_storage_path, destinationPath);
  if (copyError) {
    await session.supabase
      .from("courses")
      .delete()
      .eq("id", course.id)
      .eq("owner_id", session.userId);
    return errorResponse(
      "IMPORT_PDF_FAILED",
      "We couldn’t copy the syllabus into your private workspace.",
      500,
    );
  }

  const events = Array.isArray(publication.calendar_events)
    ? publication.calendar_events
    : [];
  const categories = Array.isArray(publication.grading_categories)
    ? publication.grading_categories
    : [];
  const policies = Array.isArray(publication.grading_policies)
    ? publication.grading_policies
    : [];
  const people = Array.isArray(publication.course_people)
    ? publication.course_people
    : [];

  const writes = [
    session.supabase.from("syllabus_sources").insert({
      course_id: course.id,
      owner_id: session.userId,
      source_type: "pdf",
      original_name: publication.source_original_name,
      storage_path: destinationPath,
      mime_type: publication.source_mime_type,
      sha256: publication.source_sha256,
      size_bytes: publication.source_size_bytes,
      page_count: publication.source_page_count,
      processing_status: "parsed",
    }),
    events.length
      ? session.supabase.from("calendar_events").insert(
          events.map((event) => ({
            course_id: course.id,
            owner_id: session.userId,
            title: event.title,
            event_type: event.event_type,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            start_date: event.start_date,
            end_date: event.end_date,
            is_all_day: event.is_all_day,
            time_zone: event.time_zone,
            location: event.location,
            rrule: event.rrule,
            status: event.status,
            origin: "community_import",
          })),
        )
      : Promise.resolve({ error: null }),
    categories.length
      ? session.supabase.from("grading_categories").insert(
          categories.map((category) => ({
            course_id: course.id,
            owner_id: session.userId,
            name: category.name,
            weight_percent: category.weight_percent,
            aggregation_mode: category.aggregation_mode,
            is_complete: category.is_complete,
            display_order: category.display_order,
            origin: "community_import",
          })),
        )
      : Promise.resolve({ error: null }),
    policies.length
      ? session.supabase.from("grading_policies").insert(
          policies.map((policy) => ({
            course_id: course.id,
            owner_id: session.userId,
            kind: policy.kind,
            description: policy.description,
            calculator_support: policy.calculator_support,
            origin: "community_import",
          })),
        )
      : Promise.resolve({ error: null }),
    people.length
      ? session.supabase.from("course_people").insert(
          people.map((person) => ({
            course_id: course.id,
            owner_id: session.userId,
            name: person.name,
            role: person.role,
            email:
              person.role === "instructor" && typeof person.email === "string"
                ? person.email.trim() || null
                : null,
            origin: "community_import",
          })),
        )
      : Promise.resolve({ error: null }),
  ];
  const results = await Promise.all(writes);
  if (results.some((result) => result.error)) {
    await session.supabase.storage.from("syllabi").remove([destinationPath]);
    await session.supabase
      .from("courses")
      .delete()
      .eq("id", course.id)
      .eq("owner_id", session.userId);
    return errorResponse(
      "IMPORT_CONTENT_FAILED",
      "We couldn’t finish copying the course. No partial workspace was kept.",
      500,
    );
  }

  const { error: importError } = await session.supabase
    .from("community_imports")
    .insert({
      publication_id: publication.id,
      user_id: session.userId,
      course_id: course.id,
    });
  if (importError) {
    return errorResponse(
      "IMPORT_TRACKING_FAILED",
      "The course was copied, but its community attribution could not be saved.",
      500,
      { courseId: course.id },
    );
  }

  revalidatePath("/(app)", "layout");
  revalidatePath("/dashboard");
  return Response.json(
    { courseId: course.id, reused: false },
    { status: 201, headers: { "Cache-Control": "private, no-store" } },
  );
}
