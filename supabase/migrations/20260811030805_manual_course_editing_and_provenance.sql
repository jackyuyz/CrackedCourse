-- Keep editable workspace records separate from their source evidence. A
-- source_item_id still points at the immutable extraction item; origin and
-- is_hidden describe the owner's current workspace choice.

do $$
begin
  create type public.course_record_origin as enum (
    'syllabus',
    'manual',
    'community_import'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.course_people
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

alter table public.office_hours
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

alter table public.calendar_events
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

alter table public.grading_categories
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

alter table public.grading_policies
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

alter table public.assessments
  add column if not exists source_item_id uuid references public.extraction_items (id) on delete set null,
  add column if not exists origin public.course_record_origin not null default 'manual',
  add column if not exists is_hidden boolean not null default false;

update public.course_people record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  when record.source_item_id is not null then 'syllabus'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

update public.office_hours record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  when record.source_item_id is not null then 'syllabus'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

update public.calendar_events record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  when record.source_item_id is not null then 'syllabus'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

update public.grading_categories record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  when record.source_item_id is not null then 'syllabus'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

update public.grading_policies record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  when record.source_item_id is not null then 'syllabus'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

update public.assessments record
set origin = case
  when course.imported_from_publication_id is not null then 'community_import'::public.course_record_origin
  else 'manual'::public.course_record_origin
end
from public.courses course
where course.id = record.course_id;

create index if not exists course_people_visible_course_idx
on public.course_people (course_id, created_at)
where not is_hidden;

create index if not exists office_hours_visible_course_idx
on public.office_hours (course_id, created_at)
where not is_hidden;

create index if not exists calendar_events_visible_course_idx
on public.calendar_events (course_id, starts_at, start_date)
where not is_hidden;

create index if not exists grading_categories_visible_course_idx
on public.grading_categories (course_id, display_order)
where not is_hidden;

create index if not exists grading_policies_visible_course_idx
on public.grading_policies (course_id, created_at)
where not is_hidden;

create index if not exists assessments_visible_course_idx
on public.assessments (course_id, category_id, display_order)
where not is_hidden;

comment on column public.grading_categories.origin is
  'Provenance of the course structure. Personal student_score_percent remains private and is never published.';

comment on column public.assessments.is_hidden is
  'Soft deletion preserves source evidence and avoids silently restoring intentionally removed syllabus records.';
