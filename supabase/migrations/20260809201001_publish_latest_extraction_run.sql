-- Keep historical extraction runs while publishing only the latest ready run.
alter function public.publish_course(uuid) rename to publish_course_all_runs;

create function public.publish_course(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  latest_run_id uuid;
  previous_reviews jsonb;
  previous_review record;
  published_course_id uuid;
begin
  select id
  into latest_run_id
  from public.extraction_runs
  where course_id = p_course_id
    and owner_id = (select auth.uid())
    and status in ('succeeded', 'partial')
  order by created_at desc, id desc
  limit 1;

  if latest_run_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'EXTRACTION_NOT_READY';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'review_status', review_status,
        'reviewed_at', reviewed_at
      )
    ),
    '[]'::jsonb
  )
  into previous_reviews
  from public.extraction_items
  where course_id = p_course_id
    and owner_id = (select auth.uid())
    and run_id <> latest_run_id;

  update public.extraction_items
  set review_status = 'rejected',
      reviewed_at = coalesce(reviewed_at, now())
  where course_id = p_course_id
    and owner_id = (select auth.uid())
    and run_id <> latest_run_id;

  published_course_id := public.publish_course_all_runs(p_course_id);

  for previous_review in
    select *
    from jsonb_to_recordset(previous_reviews) as restored_review(
      id uuid,
      review_status public.review_status,
      reviewed_at timestamptz
    )
  loop
    update public.extraction_items
    set review_status = previous_review.review_status,
        reviewed_at = previous_review.reviewed_at
    where id = previous_review.id
      and course_id = p_course_id
      and owner_id = (select auth.uid());
  end loop;

  return published_course_id;
end;
$$;

revoke all on function public.publish_course_all_runs(uuid) from public, anon;
grant execute on function public.publish_course_all_runs(uuid) to authenticated;

revoke all on function public.publish_course(uuid) from public, anon;
grant execute on function public.publish_course(uuid) to authenticated;
