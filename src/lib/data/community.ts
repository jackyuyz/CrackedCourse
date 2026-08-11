import "server-only";

import type { Viewer } from "@/lib/auth/viewer";
import type { InstitutionOption } from "@/lib/institutions";
import { createClient } from "@/lib/supabase/server";

export interface CommunityPublicationSummary {
  id: string;
  courseCode: string;
  courseTitle: string;
  termName: string | null;
  termYear: number | null;
  termPeriod: string | null;
  contributorName: string;
  updatedAt: string;
  pageCount: number | null;
  institution: InstitutionOption;
  endorsementCount: number;
}

export interface CommunityPublicationDetail
  extends CommunityPublicationSummary {
  ownerId: string;
  section: string | null;
  termStart: string | null;
  termEnd: string | null;
  timeZone: string;
  sourceOriginalName: string;
  sourceSizeBytes: number | null;
  version: number;
  events: Array<{
    title: string;
    event_type: string;
    starts_at: string | null;
    start_date: string | null;
    is_all_day: boolean;
    time_zone: string | null;
    location: string | null;
    status: string | null;
  }>;
  categories: Array<{
    name: string;
    weight_percent: number | string;
  }>;
  policies: Array<{
    kind: string;
    description: string;
    calculator_support: string;
  }>;
  people: Array<{ name: string; role: string }>;
  endorsedByViewer: boolean;
}

function mapInstitution(row: {
  id: string;
  canonical_name: string;
  city: string | null;
  region_code: string | null;
  country_code: string;
  default_time_zone: string;
}): InstitutionOption {
  return {
    id: row.id,
    name: row.canonical_name,
    city: row.city,
    region: row.region_code,
    country: row.country_code as "US" | "CA",
    timeZone: row.default_time_zone,
  };
}

function endorsementCount(value: unknown) {
  if (!Array.isArray(value)) return 0;
  const count = (value[0] as { count?: number } | undefined)?.count;
  return typeof count === "number" ? count : value.length;
}

function safeSearch(value: string) {
  return value
    .trim()
    .slice(0, 80)
    .replace(/[^a-zA-Z0-9\s-]/g, "");
}

export async function getCommunityPublications(
  viewer: Viewer,
  filters: {
    institutionId?: string | null;
    query?: string | null;
    termYear?: number | null;
  },
): Promise<CommunityPublicationSummary[]> {
  if (viewer.isDemo) return [];

  const supabase = await createClient();
  let request = supabase
    .from("community_publications")
    .select(
      "id,course_code,normalized_course_code,course_title,term_name,term_year,term_period,contributor_display_name,updated_at,source_page_count,institutions(id,canonical_name,city,region_code,country_code,default_time_zone),community_endorsements(count)",
    )
    .eq("publication_status", "published")
    .order("updated_at", { ascending: false })
    .limit(60);

  if (filters.institutionId) {
    request = request.eq("institution_id", filters.institutionId);
  }
  if (filters.termYear) request = request.eq("term_year", filters.termYear);
  const search = safeSearch(filters.query ?? "");
  if (search) {
    const normalized = search
      .toLocaleUpperCase("en-US")
      .replace(/[^A-Z0-9]/g, "");
    request = request.or(
      `course_title.ilike.%${search}%,course_code.ilike.%${search}%,normalized_course_code.ilike.%${normalized}%`,
    );
  }

  const { data } = await request;
  return (data ?? []).flatMap((publication) => {
    const institution = Array.isArray(publication.institutions)
      ? publication.institutions[0]
      : publication.institutions;
    if (!institution) return [];
    return [
      {
        id: publication.id,
        courseCode: publication.course_code,
        courseTitle: publication.course_title,
        termName: publication.term_name,
        termYear: publication.term_year,
        termPeriod: publication.term_period,
        contributorName: publication.contributor_display_name,
        updatedAt: publication.updated_at,
        pageCount: publication.source_page_count,
        institution: mapInstitution(institution),
        endorsementCount: endorsementCount(
          publication.community_endorsements,
        ),
      },
    ];
  });
}

export async function getInstitutionById(
  viewer: Viewer,
  institutionId: string,
): Promise<InstitutionOption | null> {
  if (viewer.isDemo) return viewer.defaultInstitution;
  const supabase = await createClient();
  const { data } = await supabase
    .from("institutions")
    .select(
      "id,canonical_name,city,region_code,country_code,default_time_zone",
    )
    .eq("id", institutionId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? mapInstitution(data) : null;
}

export async function getCommunityPublication(
  viewer: Viewer,
  publicationId: string,
): Promise<CommunityPublicationDetail | null> {
  if (viewer.isDemo) return null;
  const supabase = await createClient();
  const [{ data: publication }, { data: endorsement }] = await Promise.all([
    supabase
      .from("community_publications")
      .select(
        "id,owner_id,course_code,course_title,section,term_name,term_year,term_period,term_start,term_end,time_zone,contributor_display_name,updated_at,source_original_name,source_size_bytes,source_page_count,snapshot_version,calendar_events,grading_categories,grading_policies,course_people,institutions(id,canonical_name,city,region_code,country_code,default_time_zone),community_endorsements(count)",
      )
      .eq("id", publicationId)
      .eq("publication_status", "published")
      .maybeSingle(),
    supabase
      .from("community_endorsements")
      .select("publication_id")
      .eq("publication_id", publicationId)
      .eq("user_id", viewer.id)
      .maybeSingle(),
  ]);
  if (!publication) return null;
  const institution = Array.isArray(publication.institutions)
    ? publication.institutions[0]
    : publication.institutions;
  if (!institution) return null;

  return {
    id: publication.id,
    ownerId: publication.owner_id,
    courseCode: publication.course_code,
    courseTitle: publication.course_title,
    section: publication.section,
    termName: publication.term_name,
    termYear: publication.term_year,
    termPeriod: publication.term_period,
    termStart: publication.term_start,
    termEnd: publication.term_end,
    timeZone: publication.time_zone,
    contributorName: publication.contributor_display_name,
    updatedAt: publication.updated_at,
    sourceOriginalName: publication.source_original_name,
    sourceSizeBytes: publication.source_size_bytes,
    pageCount: publication.source_page_count,
    version: publication.snapshot_version,
    events: Array.isArray(publication.calendar_events)
      ? publication.calendar_events
      : [],
    categories: Array.isArray(publication.grading_categories)
      ? publication.grading_categories
      : [],
    policies: Array.isArray(publication.grading_policies)
      ? publication.grading_policies
      : [],
    people: Array.isArray(publication.course_people)
      ? publication.course_people
      : [],
    institution: mapInstitution(institution),
    endorsementCount: endorsementCount(publication.community_endorsements),
    endorsedByViewer: Boolean(endorsement),
  };
}
