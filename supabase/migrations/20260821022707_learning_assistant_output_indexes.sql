create index if not exists learning_unit_ai_outputs_course_idx
on public.learning_unit_ai_outputs (course_id);

create index if not exists learning_unit_ai_outputs_unit_idx
on public.learning_unit_ai_outputs (learning_unit_id);
