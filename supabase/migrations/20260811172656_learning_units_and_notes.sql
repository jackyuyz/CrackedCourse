create type public.learning_unit_note_visibility as enum ('public', 'private');
create type public.course_material_kind as enum ('file', 'link');
create type public.course_material_type as enum ('pdf', 'slides', 'link', 'other');

create table public.learning_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  display_order integer not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_units_title_check check (char_length(trim(title)) between 1 and 180),
  constraint learning_units_description_check check (
    description is null or char_length(description) <= 1000
  ),
  constraint learning_units_display_order_check check (display_order >= 0)
);

create table public.learning_unit_notes (
  id uuid primary key default gen_random_uuid(),
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  visibility public.learning_unit_note_visibility not null,
  body_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_unit_notes_visibility_unique unique (learning_unit_id, visibility),
  constraint learning_unit_notes_body_length_check check (char_length(body_markdown) <= 120000)
);

create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  learning_unit_id uuid references public.learning_units (id) on delete set null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind public.course_material_kind not null,
  material_type public.course_material_type not null,
  storage_path text,
  external_url text,
  original_name text,
  mime_type text,
  size_bytes integer,
  display_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_materials_title_check check (char_length(trim(title)) between 1 and 180),
  constraint course_materials_size_check check (size_bytes is null or size_bytes >= 0),
  constraint course_materials_display_order_check check (display_order >= 0),
  constraint course_materials_file_shape_check check (
    (kind = 'file' and storage_path is not null and external_url is null)
    or
    (kind = 'link' and external_url is not null and storage_path is null)
  )
);

create index learning_units_course_visible_order_idx
on public.learning_units (course_id, is_hidden, display_order);

create index learning_unit_notes_owner_visibility_idx
on public.learning_unit_notes (owner_id, visibility);

create index course_materials_course_unit_visible_order_idx
on public.course_materials (course_id, learning_unit_id, is_hidden, display_order);

create trigger set_learning_units_updated_at
before update on public.learning_units
for each row execute function private.set_updated_at();

create trigger set_learning_unit_notes_updated_at
before update on public.learning_unit_notes
for each row execute function private.set_updated_at();

create trigger set_course_materials_updated_at
before update on public.course_materials
for each row execute function private.set_updated_at();

alter table public.learning_units enable row level security;
alter table public.learning_unit_notes enable row level security;
alter table public.course_materials enable row level security;

create policy learning_units_select_own
on public.learning_units for select to authenticated
using ((select auth.uid()) = owner_id);

create policy learning_units_insert_own
on public.learning_units for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.courses course
    where course.id = learning_units.course_id
      and course.owner_id = (select auth.uid())
  )
);

create policy learning_units_update_own
on public.learning_units for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.courses course
    where course.id = learning_units.course_id
      and course.owner_id = (select auth.uid())
  )
);

create policy learning_units_delete_own
on public.learning_units for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy learning_unit_notes_select_own
on public.learning_unit_notes for select to authenticated
using ((select auth.uid()) = owner_id);

create policy learning_unit_notes_insert_own
on public.learning_unit_notes for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.learning_units unit
    where unit.id = learning_unit_notes.learning_unit_id
      and unit.owner_id = (select auth.uid())
  )
);

create policy learning_unit_notes_update_own
on public.learning_unit_notes for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.learning_units unit
    where unit.id = learning_unit_notes.learning_unit_id
      and unit.owner_id = (select auth.uid())
  )
);

create policy learning_unit_notes_delete_own
on public.learning_unit_notes for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy course_materials_select_own
on public.course_materials for select to authenticated
using ((select auth.uid()) = owner_id);

create policy course_materials_insert_own
on public.course_materials for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.courses course
    where course.id = course_materials.course_id
      and course.owner_id = (select auth.uid())
  )
  and (
    learning_unit_id is null
    or exists (
      select 1 from public.learning_units unit
      where unit.id = course_materials.learning_unit_id
        and unit.course_id = course_materials.course_id
        and unit.owner_id = (select auth.uid())
    )
  )
);

create policy course_materials_update_own
on public.course_materials for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.courses course
    where course.id = course_materials.course_id
      and course.owner_id = (select auth.uid())
  )
  and (
    learning_unit_id is null
    or exists (
      select 1 from public.learning_units unit
      where unit.id = course_materials.learning_unit_id
        and unit.course_id = course_materials.course_id
        and unit.owner_id = (select auth.uid())
    )
  )
);

create policy course_materials_delete_own
on public.course_materials for delete to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.learning_units to authenticated;
grant select, insert, update, delete on public.learning_unit_notes to authenticated;
grant select, insert, update, delete on public.course_materials to authenticated;

alter table public.community_publications
  add column learning_units jsonb not null default '[]'::jsonb;

alter table public.community_publications
  add constraint community_publications_learning_units_array_check
  check (jsonb_typeof(learning_units) = 'array');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy course_materials_storage_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy course_materials_storage_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy course_materials_storage_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy course_materials_storage_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
