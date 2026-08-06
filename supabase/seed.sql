-- Fictional local-development data only. This user has no password and cannot
-- sign in; use local Studio/Auth to create a login-capable developer account.
insert into auth.users (id, email, raw_user_meta_data)
values (
  'd0e3c8f0-1234-4678-9abc-def012345678',
  'maya.student@example.edu',
  '{"display_name":"Maya","time_zone":"America/New_York"}'::jsonb
)
on conflict (id) do nothing;

insert into public.courses (
  id,
  owner_id,
  code,
  title,
  section,
  term_name,
  term_start,
  term_end,
  time_zone,
  color_key,
  status,
  published_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    '15-122',
    'Principles of Imperative Computation',
    'Section A',
    'Fall 2026',
    '2026-08-31',
    '2026-12-11',
    'America/New_York',
    'ocean',
    'active',
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'DES 210',
    'Communication Design Studio',
    'Studio 03',
    'Fall 2026',
    '2026-08-31',
    '2026-12-11',
    'America/New_York',
    'orange',
    'active',
    now()
  )
on conflict (id) do nothing;

insert into public.calendar_events (
  id,
  course_id,
  owner_id,
  title,
  event_type,
  start_date,
  is_all_day,
  time_zone,
  status,
  ical_uid
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Written Homework 2',
    'assignment',
    '2026-09-09',
    true,
    'America/New_York',
    'confirmed',
    'seed-homework-2@crackedcourse'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Critique: Systems Study',
    'project',
    '2026-09-11',
    true,
    'America/New_York',
    'confirmed',
    'seed-systems-critique@crackedcourse'
  )
on conflict (id) do nothing;

insert into public.grading_categories (
  id,
  course_id,
  owner_id,
  name,
  weight_percent,
  aggregation_mode,
  display_order
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Written homework',
    20,
    'points',
    0
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Programming assignments',
    35,
    'points',
    1
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Midterms',
    25,
    'points',
    2
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Final exam',
    20,
    'points',
    3
  )
on conflict (id) do nothing;

insert into public.assessments (
  id,
  course_id,
  category_id,
  owner_id,
  name,
  earned_points,
  max_points,
  status,
  display_order
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Written Homework 1',
    47,
    50,
    'graded',
    0
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'd0e3c8f0-1234-4678-9abc-def012345678',
    'Programming Assignment 1',
    82,
    100,
    'graded',
    0
  )
on conflict (id) do nothing;
