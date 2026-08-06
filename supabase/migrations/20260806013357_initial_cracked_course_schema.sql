create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create type public.course_status as enum ('draft', 'active', 'archived');
create type public.source_type as enum ('pdf', 'url');
create type public.source_processing_status as enum (
  'uploaded',
  'parsing',
  'parsed',
  'failed',
  'unsupported'
);
create type public.extraction_status as enum (
  'queued',
  'running',
  'succeeded',
  'partial',
  'failed'
);
create type public.extraction_item_type as enum (
  'course_field',
  'person',
  'office_hour',
  'event',
  'grading_category',
  'grading_policy'
);
create type public.confidence_label as enum ('high', 'review', 'low');
create type public.review_status as enum ('pending', 'confirmed', 'edited', 'rejected');
create type public.person_role as enum ('instructor', 'teaching_assistant', 'other');
create type public.event_type as enum (
  'exam',
  'quiz',
  'assignment',
  'project',
  'office_hour',
  'class_session',
  'deadline',
  'other'
);
create type public.event_status as enum ('confirmed', 'cancelled');
create type public.aggregation_mode as enum ('points', 'equal', 'custom');
create type public.assessment_status as enum ('planned', 'graded', 'excused');
create type public.calculator_support as enum ('unsupported', 'supported');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  institution_name text,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  code text,
  title text,
  section text,
  term_name text,
  term_start date,
  term_end date,
  time_zone text not null default 'UTC',
  color_key text not null default 'ocean',
  status public.course_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_term_range_check check (
    term_start is null or term_end is null or term_end >= term_start
  ),
  constraint courses_publish_state_check check (
    status <> 'active' or published_at is not null
  )
);

create table public.syllabus_sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_type public.source_type not null default 'pdf',
  original_name text not null,
  storage_path text,
  source_url text,
  mime_type text not null,
  sha256 text not null,
  size_bytes integer,
  page_count integer,
  processing_status public.source_processing_status not null default 'uploaded',
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_sources_size_check check (size_bytes is null or size_bytes >= 0),
  constraint syllabus_sources_page_count_check check (page_count is null or page_count >= 0),
  constraint syllabus_sources_location_check check (
    (source_type = 'pdf' and storage_path is not null and source_url is null)
    or
    (source_type = 'url' and source_url is not null)
  ),
  constraint syllabus_sources_owner_hash_unique unique (owner_id, sha256)
);

create table public.source_pages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.syllabus_sources (id) on delete cascade,
  page_number integer not null,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_pages_page_number_check check (page_number > 0),
  constraint source_pages_source_page_unique unique (source_id, page_number)
);

create table public.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.syllabus_sources (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status public.extraction_status not null default 'queued',
  schema_version text not null,
  provider text not null,
  model text not null,
  prompt_version text not null,
  raw_result jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_runs_warning_array_check check (
    jsonb_typeof(validation_warnings) = 'array'
  ),
  constraint extraction_runs_timing_check check (
    started_at is null or completed_at is null or completed_at >= started_at
  )
);

create table public.extraction_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.extraction_runs (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  item_type public.extraction_item_type not null,
  original_payload jsonb not null,
  current_payload jsonb not null,
  confidence numeric(5, 4),
  confidence_label public.confidence_label not null default 'review',
  evidence jsonb not null default '[]'::jsonb,
  review_status public.review_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extraction_items_confidence_check check (
    confidence is null or confidence between 0 and 1
  ),
  constraint extraction_items_evidence_array_check check (jsonb_typeof(evidence) = 'array'),
  constraint extraction_items_reviewed_state_check check (
    (review_status = 'pending' and reviewed_at is null)
    or
    (review_status <> 'pending' and reviewed_at is not null)
  )
);

create table public.course_people (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role public.person_role not null,
  email text,
  office_location text,
  external_profile_url text,
  source_item_id uuid references public.extraction_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.office_hours (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  person_id uuid references public.course_people (id) on delete set null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  recurrence_text text,
  day_of_week smallint,
  start_time time,
  end_time time,
  start_date date,
  end_date date,
  time_zone text,
  location text,
  meeting_url text,
  is_calendar_ready boolean not null default false,
  source_item_id uuid references public.extraction_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint office_hours_day_check check (day_of_week is null or day_of_week between 0 and 6),
  constraint office_hours_time_check check (
    start_time is null or end_time is null or end_time > start_time
  ),
  constraint office_hours_date_check check (
    start_date is null or end_date is null or end_date >= start_date
  ),
  constraint office_hours_calendar_ready_check check (
    not is_calendar_ready
    or
    (day_of_week is not null and start_time is not null and start_date is not null
      and end_date is not null and time_zone is not null)
  )
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_type public.event_type not null,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date date,
  is_all_day boolean not null default true,
  time_zone text not null,
  location text,
  notes text,
  rrule text,
  status public.event_status not null default 'confirmed',
  source_item_id uuid references public.extraction_items (id) on delete set null,
  ical_uid text not null unique default (gen_random_uuid()::text || '@crackedcourse'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_date_shape_check check (
    (
      is_all_day
      and start_date is not null
      and starts_at is null
      and ends_at is null
    )
    or
    (
      not is_all_day
      and starts_at is not null
      and start_date is null
      and end_date is null
    )
  ),
  constraint calendar_events_all_day_range_check check (
    not is_all_day or end_date is null or end_date >= start_date
  ),
  constraint calendar_events_timed_range_check check (
    is_all_day or ends_at is null or ends_at >= starts_at
  )
);

create table public.grading_categories (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  weight_percent numeric(6, 3) not null,
  aggregation_mode public.aggregation_mode not null default 'points',
  is_complete boolean not null default false,
  display_order integer not null default 0,
  source_item_id uuid references public.extraction_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grading_categories_weight_check check (weight_percent between 0 and 100)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  category_id uuid not null references public.grading_categories (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  due_event_id uuid references public.calendar_events (id) on delete set null,
  earned_points numeric,
  max_points numeric,
  expected_percent numeric,
  status public.assessment_status not null default 'planned',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessments_earned_check check (earned_points is null or earned_points >= 0),
  constraint assessments_max_check check (max_points is null or max_points > 0),
  constraint assessments_no_extra_credit_check check (
    earned_points is null or max_points is null or earned_points <= max_points
  ),
  constraint assessments_expected_check check (
    expected_percent is null or expected_percent between 0 and 100
  ),
  constraint assessments_graded_shape_check check (
    status <> 'graded' or (earned_points is not null and max_points is not null)
  )
);

create table public.grading_policies (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  description text not null,
  calculator_support public.calculator_support not null default 'unsupported',
  source_item_id uuid references public.extraction_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_owner_status_idx on public.courses (owner_id, status);
create index syllabus_sources_course_idx on public.syllabus_sources (course_id);
create index source_pages_source_idx on public.source_pages (source_id, page_number);
create index extraction_runs_course_created_idx on public.extraction_runs (course_id, created_at desc);
create index extraction_items_run_status_idx on public.extraction_items (run_id, review_status);
create index course_people_course_idx on public.course_people (course_id);
create index office_hours_course_idx on public.office_hours (course_id);
create index calendar_events_owner_time_idx on public.calendar_events (owner_id, starts_at);
create index calendar_events_owner_date_idx on public.calendar_events (owner_id, start_date);
create index grading_categories_course_order_idx on public.grading_categories (course_id, display_order);
create index assessments_category_order_idx on public.assessments (category_id, display_order);
create index grading_policies_course_idx on public.grading_policies (course_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, time_zone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'time_zone', ''), 'UTC')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'courses',
    'syllabus_sources',
    'source_pages',
    'extraction_runs',
    'extraction_items',
    'course_people',
    'office_hours',
    'calendar_events',
    'grading_categories',
    'assessments',
    'grading_policies'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.syllabus_sources enable row level security;
alter table public.source_pages enable row level security;
alter table public.extraction_runs enable row level security;
alter table public.extraction_items enable row level security;
alter table public.course_people enable row level security;
alter table public.office_hours enable row level security;
alter table public.calendar_events enable row level security;
alter table public.grading_categories enable row level security;
alter table public.assessments enable row level security;
alter table public.grading_policies enable row level security;

create policy profiles_select_own
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'courses',
    'syllabus_sources',
    'extraction_runs',
    'extraction_items',
    'course_people',
    'office_hours',
    'calendar_events',
    'grading_categories',
    'assessments',
    'grading_policies'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = owner_id)',
      table_name || '_select_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = owner_id)',
      table_name || '_insert_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
      table_name || '_update_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = owner_id)',
      table_name || '_delete_own',
      table_name
    );
  end loop;
end;
$$;

create policy source_pages_select_own
on public.source_pages for select
to authenticated
using (
  exists (
    select 1
    from public.syllabus_sources source
    where source.id = source_pages.source_id
      and source.owner_id = (select auth.uid())
  )
);

create policy source_pages_insert_own
on public.source_pages for insert
to authenticated
with check (
  exists (
    select 1
    from public.syllabus_sources source
    where source.id = source_pages.source_id
      and source.owner_id = (select auth.uid())
  )
);

create policy source_pages_update_own
on public.source_pages for update
to authenticated
using (
  exists (
    select 1
    from public.syllabus_sources source
    where source.id = source_pages.source_id
      and source.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.syllabus_sources source
    where source.id = source_pages.source_id
      and source.owner_id = (select auth.uid())
  )
);

create policy source_pages_delete_own
on public.source_pages for delete
to authenticated
using (
  exists (
    select 1
    from public.syllabus_sources source
    where source.id = source_pages.source_id
      and source.owner_id = (select auth.uid())
  )
);

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('syllabi', 'syllabi', false, 15728640, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy syllabi_select_own
on storage.objects for select
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy syllabi_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy syllabi_update_own
on storage.objects for update
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy syllabi_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'syllabi'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
