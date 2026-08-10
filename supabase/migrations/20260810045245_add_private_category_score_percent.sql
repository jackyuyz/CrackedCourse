alter table public.grading_categories
  add column student_score_percent numeric(5, 2);

alter table public.grading_categories
  add constraint grading_categories_student_score_check
  check (
    student_score_percent is null
    or student_score_percent between 0 and 100
  );

comment on column public.grading_categories.student_score_percent is
  'Owner-private percentage score used by the grade calculator. Never included in community publication snapshots.';

-- Preserve any grades entered through the original earned/max-points UI by
-- converting the graded work in each category to a single percentage.
with existing_scores as (
  select
    category_id,
    round(
      (sum(earned_points)::numeric / nullif(sum(max_points), 0)) * 100,
      2
    ) as score_percent
  from public.assessments
  where status = 'graded'
    and earned_points is not null
    and max_points is not null
    and max_points > 0
  group by category_id
)
update public.grading_categories category
set student_score_percent = existing.score_percent
from existing_scores existing
where category.id = existing.category_id
  and category.student_score_percent is null;
