alter table public.grading_categories
  drop constraint grading_categories_student_score_check;

alter table public.grading_categories
  add constraint grading_categories_student_score_check
  check (
    student_score_percent is null
    or student_score_percent between 0 and 999.99
  );

comment on column public.grading_categories.student_score_percent is
  'Owner-private percentage score used by the grade calculator. Values over 100 represent extra credit. Never included in community publication snapshots.';
