alter table public.learning_unit_ai_outputs
add column source_fingerprint text,
add column insufficiency text;

alter table public.learning_unit_ai_outputs
add constraint learning_unit_ai_outputs_source_fingerprint_check check (
  source_fingerprint is null or char_length(source_fingerprint) = 64
),
add constraint learning_unit_ai_outputs_insufficiency_length_check check (
  insufficiency is null or char_length(insufficiency) <= 2000
);

create unique index learning_unit_ai_outputs_guide_cache_unique_idx
on public.learning_unit_ai_outputs (
  owner_id,
  learning_unit_id,
  action,
  source_fingerprint,
  prompt_version
)
where source_fingerprint is not null;
