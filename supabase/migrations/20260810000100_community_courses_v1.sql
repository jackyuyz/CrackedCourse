create type public.community_publication_status as enum ('published', 'hidden');
create type public.community_report_status as enum ('open', 'resolved', 'dismissed');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,
  external_id text not null,
  canonical_name text not null,
  country_code text not null,
  region_code text,
  city text,
  campus_name text,
  domain text,
  aliases text[] not null default '{}',
  default_time_zone text not null default 'America/New_York',
  search_text text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_source_id_unique unique (external_source, external_id),
  constraint institutions_country_check check (country_code in ('US', 'CA')),
  constraint institutions_source_check check (external_source in ('IPEDS', 'DLI', 'manual')),
  constraint institutions_name_check check (char_length(trim(canonical_name)) between 2 and 180)
);

create function private.set_institution_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text = lower(concat_ws(
    ' ',
    new.canonical_name,
    new.domain,
    new.city,
    new.region_code,
    new.country_code,
    new.external_id,
    array_to_string(new.aliases, ' ')
  ));
  return new;
end;
$$;

create trigger set_institutions_search_text
before insert or update of canonical_name, domain, city, region_code, country_code, external_id, aliases
on public.institutions
for each row execute function private.set_institution_search_text();

create trigger set_institutions_updated_at
before update on public.institutions
for each row execute function private.set_updated_at();

alter table public.profiles
  add column default_institution_id uuid references public.institutions (id) on delete set null;

alter table public.courses
  add column institution_id uuid references public.institutions (id) on delete set null;

create table public.community_publications (
  id uuid primary key default gen_random_uuid(),
  source_course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references public.institutions (id) on delete restrict,
  course_code text not null,
  normalized_course_code text not null,
  course_title text not null,
  section text,
  term_name text,
  term_year integer,
  term_period text,
  term_start date,
  term_end date,
  time_zone text not null,
  contributor_display_name text not null,
  calendar_events jsonb not null default '[]'::jsonb,
  grading_categories jsonb not null default '[]'::jsonb,
  grading_policies jsonb not null default '[]'::jsonb,
  course_people jsonb not null default '[]'::jsonb,
  source_storage_path text not null,
  source_original_name text not null,
  source_mime_type text not null default 'application/pdf',
  source_sha256 text not null,
  source_size_bytes integer,
  source_page_count integer,
  snapshot_version integer not null default 1,
  publication_status public.community_publication_status not null default 'published',
  rights_confirmed_at timestamptz not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_publications_source_course_unique unique (source_course_id),
  constraint community_publications_code_check check (char_length(trim(course_code)) between 1 and 40),
  constraint community_publications_title_check check (char_length(trim(course_title)) between 1 and 180),
  constraint community_publications_year_check check (term_year is null or term_year between 1980 and 2200),
  constraint community_publications_period_check check (
    term_period is null or term_period in ('winter', 'spring', 'summer', 'fall', 'other')
  ),
  constraint community_publications_term_range_check check (
    term_start is null or term_end is null or term_end >= term_start
  ),
  constraint community_publications_snapshot_version_check check (snapshot_version > 0),
  constraint community_publications_source_size_check check (
    source_size_bytes is null or source_size_bytes >= 0
  ),
  constraint community_publications_source_page_check check (
    source_page_count is null or source_page_count >= 0
  ),
  constraint community_publications_event_array_check check (jsonb_typeof(calendar_events) = 'array'),
  constraint community_publications_category_array_check check (jsonb_typeof(grading_categories) = 'array'),
  constraint community_publications_policy_array_check check (jsonb_typeof(grading_policies) = 'array'),
  constraint community_publications_people_array_check check (jsonb_typeof(course_people) = 'array')
);

alter table public.courses
  add column imported_from_publication_id uuid references public.community_publications (id) on delete set null;

create table public.community_endorsements (
  publication_id uuid not null references public.community_publications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (publication_id, user_id)
);

create table public.community_imports (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.community_publications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_imports_user_course_unique unique (user_id, course_id),
  constraint community_imports_publication_course_unique unique (publication_id, course_id)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.community_publications (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  details text,
  status public.community_report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_reports_reason_check check (
    reason in ('copyright', 'personal_information', 'incorrect', 'spam', 'other')
  ),
  constraint community_reports_details_check check (details is null or char_length(details) <= 1000),
  constraint community_reports_reporter_unique unique (publication_id, reporter_id)
);

create trigger set_community_publications_updated_at
before update on public.community_publications
for each row execute function private.set_updated_at();

create trigger set_community_reports_updated_at
before update on public.community_reports
for each row execute function private.set_updated_at();

create index institutions_active_name_idx
on public.institutions (is_active, canonical_name);

create index institutions_search_text_idx
on public.institutions (search_text text_pattern_ops);

create index courses_institution_idx
on public.courses (institution_id, status);

create index community_publications_discovery_idx
on public.community_publications (
  institution_id,
  publication_status,
  normalized_course_code,
  term_year desc,
  term_period
);

create index community_publications_updated_idx
on public.community_publications (publication_status, updated_at desc);

create index community_endorsements_publication_idx
on public.community_endorsements (publication_id, created_at desc);

create index community_imports_publication_idx
on public.community_imports (publication_id, created_at desc);

create index community_reports_status_idx
on public.community_reports (status, created_at desc);

alter table public.institutions enable row level security;
alter table public.community_publications enable row level security;
alter table public.community_endorsements enable row level security;
alter table public.community_imports enable row level security;
alter table public.community_reports enable row level security;

create policy institutions_select_authenticated
on public.institutions for select
to authenticated
using (is_active);

create policy community_publications_select_authenticated
on public.community_publications for select
to authenticated
using (publication_status = 'published' or owner_id = (select auth.uid()));

create policy community_publications_insert_own
on public.community_publications for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.courses course
    where course.id = source_course_id
      and course.owner_id = (select auth.uid())
      and course.institution_id = institution_id
  )
);

create policy community_publications_update_own
on public.community_publications for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.courses course
    where course.id = source_course_id
      and course.owner_id = (select auth.uid())
      and course.institution_id = institution_id
  )
);

create policy community_publications_delete_own
on public.community_publications for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy community_endorsements_select_authenticated
on public.community_endorsements for select
to authenticated
using (
  exists (
    select 1
    from public.community_publications publication
    where publication.id = publication_id
      and publication.publication_status = 'published'
  )
);

create policy community_endorsements_insert_own
on public.community_endorsements for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.community_publications publication
    where publication.id = publication_id
      and publication.publication_status = 'published'
      and publication.owner_id <> (select auth.uid())
  )
);

create policy community_endorsements_delete_own
on public.community_endorsements for delete
to authenticated
using (user_id = (select auth.uid()));

create policy community_imports_select_own
on public.community_imports for select
to authenticated
using (user_id = (select auth.uid()));

create policy community_imports_insert_own
on public.community_imports for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.courses course
    where course.id = course_id
      and course.owner_id = (select auth.uid())
      and course.imported_from_publication_id = publication_id
  )
);

create policy community_reports_select_own
on public.community_reports for select
to authenticated
using (reporter_id = (select auth.uid()));

create policy community_reports_insert_own
on public.community_reports for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and exists (
    select 1
    from public.community_publications publication
    where publication.id = publication_id
      and publication.publication_status = 'published'
      and publication.owner_id <> (select auth.uid())
  )
);

grant select on public.institutions to authenticated;
grant select, insert, update, delete on public.community_publications to authenticated;
grant select, insert, delete on public.community_endorsements to authenticated;
grant select, insert on public.community_imports to authenticated;
grant select, insert on public.community_reports to authenticated;

revoke all on public.institutions from anon;
revoke all on public.community_publications from anon;
revoke all on public.community_endorsements from anon;
revoke all on public.community_imports from anon;
revoke all on public.community_reports from anon;

create policy syllabi_select_published_community
on storage.objects for select
to authenticated
using (
  bucket_id = 'syllabi'
  and exists (
    select 1
    from public.community_publications publication
    where publication.source_storage_path = name
      and publication.publication_status = 'published'
  )
);

insert into public.institutions (
  external_source,
  external_id,
  canonical_name,
  country_code,
  region_code,
  city,
  domain,
  aliases,
  default_time_zone
)
values
  ('IPEDS', '211440', 'Carnegie Mellon University', 'US', 'PA', 'Pittsburgh', 'cmu.edu', array['CMU', 'Carnegie Mellon'], 'America/New_York'),
  ('IPEDS', '166683', 'Massachusetts Institute of Technology', 'US', 'MA', 'Cambridge', 'mit.edu', array['MIT'], 'America/New_York'),
  ('IPEDS', '166027', 'Harvard University', 'US', 'MA', 'Cambridge', 'harvard.edu', array['Harvard'], 'America/New_York'),
  ('IPEDS', '243744', 'Stanford University', 'US', 'CA', 'Stanford', 'stanford.edu', array['Stanford'], 'America/Los_Angeles'),
  ('IPEDS', '110635', 'University of California, Berkeley', 'US', 'CA', 'Berkeley', 'berkeley.edu', array['UC Berkeley', 'Cal'], 'America/Los_Angeles'),
  ('IPEDS', '110662', 'University of California, Los Angeles', 'US', 'CA', 'Los Angeles', 'ucla.edu', array['UCLA'], 'America/Los_Angeles'),
  ('IPEDS', '190415', 'Cornell University', 'US', 'NY', 'Ithaca', 'cornell.edu', array['Cornell'], 'America/New_York'),
  ('IPEDS', '190150', 'Columbia University in the City of New York', 'US', 'NY', 'New York', 'columbia.edu', array['Columbia University', 'Columbia'], 'America/New_York'),
  ('IPEDS', '193900', 'New York University', 'US', 'NY', 'New York', 'nyu.edu', array['NYU'], 'America/New_York'),
  ('IPEDS', '186131', 'Princeton University', 'US', 'NJ', 'Princeton', 'princeton.edu', array['Princeton'], 'America/New_York'),
  ('IPEDS', '130794', 'Yale University', 'US', 'CT', 'New Haven', 'yale.edu', array['Yale'], 'America/New_York'),
  ('IPEDS', '215062', 'University of Pennsylvania', 'US', 'PA', 'Philadelphia', 'upenn.edu', array['Penn', 'UPenn'], 'America/New_York'),
  ('IPEDS', '198419', 'Duke University', 'US', 'NC', 'Durham', 'duke.edu', array['Duke'], 'America/New_York'),
  ('IPEDS', '144050', 'University of Chicago', 'US', 'IL', 'Chicago', 'uchicago.edu', array['UChicago'], 'America/Chicago'),
  ('IPEDS', '147767', 'Northwestern University', 'US', 'IL', 'Evanston', 'northwestern.edu', array['Northwestern'], 'America/Chicago'),
  ('IPEDS', '170976', 'University of Michigan-Ann Arbor', 'US', 'MI', 'Ann Arbor', 'umich.edu', array['University of Michigan', 'UMich'], 'America/Detroit'),
  ('IPEDS', '228778', 'The University of Texas at Austin', 'US', 'TX', 'Austin', 'utexas.edu', array['UT Austin'], 'America/Chicago'),
  ('IPEDS', '139755', 'Georgia Institute of Technology-Main Campus', 'US', 'GA', 'Atlanta', 'gatech.edu', array['Georgia Tech', 'GT'], 'America/New_York'),
  ('IPEDS', '145637', 'University of Illinois Urbana-Champaign', 'US', 'IL', 'Champaign', 'illinois.edu', array['UIUC', 'Illinois'], 'America/Chicago'),
  ('IPEDS', '236948', 'University of Washington-Seattle Campus', 'US', 'WA', 'Seattle', 'uw.edu', array['University of Washington', 'UW'], 'America/Los_Angeles'),
  ('IPEDS', '123961', 'University of Southern California', 'US', 'CA', 'Los Angeles', 'usc.edu', array['USC'], 'America/Los_Angeles'),
  ('IPEDS', '164988', 'Boston University', 'US', 'MA', 'Boston', 'bu.edu', array['BU'], 'America/New_York'),
  ('IPEDS', '167358', 'Northeastern University', 'US', 'MA', 'Boston', 'northeastern.edu', array['Northeastern'], 'America/New_York'),
  ('manual', 'CA-UOFT', 'University of Toronto', 'CA', 'ON', 'Toronto', 'utoronto.ca', array['U of T', 'UofT'], 'America/Toronto'),
  ('manual', 'CA-UBC', 'University of British Columbia', 'CA', 'BC', 'Vancouver', 'ubc.ca', array['UBC'], 'America/Vancouver'),
  ('manual', 'CA-MCGILL', 'McGill University', 'CA', 'QC', 'Montreal', 'mcgill.ca', array['McGill'], 'America/Toronto'),
  ('manual', 'CA-WATERLOO', 'University of Waterloo', 'CA', 'ON', 'Waterloo', 'uwaterloo.ca', array['Waterloo', 'UWaterloo'], 'America/Toronto'),
  ('manual', 'CA-SFU', 'Simon Fraser University', 'CA', 'BC', 'Burnaby', 'sfu.ca', array['SFU'], 'America/Vancouver'),
  ('manual', 'CA-ALBERTA', 'University of Alberta', 'CA', 'AB', 'Edmonton', 'ualberta.ca', array['UAlberta'], 'America/Edmonton'),
  ('manual', 'CA-MCMASTER', 'McMaster University', 'CA', 'ON', 'Hamilton', 'mcmaster.ca', array['McMaster'], 'America/Toronto'),
  ('manual', 'CA-QUEENS', 'Queen''s University', 'CA', 'ON', 'Kingston', 'queensu.ca', array['Queens University', 'Queens'], 'America/Toronto'),
  ('manual', 'CA-WESTERN', 'Western University', 'CA', 'ON', 'London', 'uwo.ca', array['University of Western Ontario', 'Western'], 'America/Toronto'),
  ('manual', 'CA-OTTAWA', 'University of Ottawa', 'CA', 'ON', 'Ottawa', 'uottawa.ca', array['uOttawa'], 'America/Toronto')
on conflict (external_source, external_id) do update
set canonical_name = excluded.canonical_name,
    country_code = excluded.country_code,
    region_code = excluded.region_code,
    city = excluded.city,
    domain = excluded.domain,
    aliases = excluded.aliases,
    default_time_zone = excluded.default_time_zone,
    is_active = true;

update public.profiles profile
set default_institution_id = institution.id,
    institution_name = institution.canonical_name
from auth.users auth_user,
     public.institutions institution
where profile.id = auth_user.id
  and auth_user.email is not null
  and (
    lower(split_part(auth_user.email, '@', 2)) = institution.domain
    or lower(split_part(auth_user.email, '@', 2)) like ('%.' || institution.domain)
  )
  and profile.default_institution_id is null;

update public.courses course
set institution_id = profile.default_institution_id
from public.profiles profile
where course.owner_id = profile.id
  and course.institution_id is null
  and profile.default_institution_id is not null;
