create type public.learning_ai_output_action as enum (
  'question',
  'explain',
  'summary',
  'practice'
);

create type public.learning_ai_output_status as enum (
  'running',
  'succeeded',
  'failed'
);

create table public.learning_unit_ai_outputs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  learning_unit_id uuid not null references public.learning_units (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  action public.learning_ai_output_action not null,
  status public.learning_ai_output_status not null default 'running',
  prompt text,
  source_selection jsonb not null default '[]'::jsonb,
  answer_markdown text,
  practice_items jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  provider text not null,
  model text not null,
  prompt_version text not null,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint learning_unit_ai_outputs_prompt_length_check check (
    prompt is null or char_length(prompt) <= 2000
  ),
  constraint learning_unit_ai_outputs_answer_length_check check (
    answer_markdown is null or char_length(answer_markdown) <= 40000
  ),
  constraint learning_unit_ai_outputs_source_selection_array_check check (
    jsonb_typeof(source_selection) = 'array'
  ),
  constraint learning_unit_ai_outputs_practice_items_array_check check (
    jsonb_typeof(practice_items) = 'array'
  ),
  constraint learning_unit_ai_outputs_citations_array_check check (
    jsonb_typeof(citations) = 'array'
  )
);

create index learning_unit_ai_outputs_owner_unit_created_idx
on public.learning_unit_ai_outputs (owner_id, learning_unit_id, created_at desc);

alter table public.learning_unit_ai_outputs enable row level security;

create policy learning_unit_ai_outputs_select_own
on public.learning_unit_ai_outputs for select to authenticated
using ((select auth.uid()) = owner_id);

create policy learning_unit_ai_outputs_insert_own
on public.learning_unit_ai_outputs for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.learning_units unit
    where unit.id = learning_unit_ai_outputs.learning_unit_id
      and unit.course_id = learning_unit_ai_outputs.course_id
      and unit.owner_id = (select auth.uid())
  )
);

create policy learning_unit_ai_outputs_update_own
on public.learning_unit_ai_outputs for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.learning_units unit
    where unit.id = learning_unit_ai_outputs.learning_unit_id
      and unit.course_id = learning_unit_ai_outputs.course_id
      and unit.owner_id = (select auth.uid())
  )
);

create policy learning_unit_ai_outputs_delete_own
on public.learning_unit_ai_outputs for delete to authenticated
using ((select auth.uid()) = owner_id);

grant select, insert, update, delete
on public.learning_unit_ai_outputs to authenticated;
