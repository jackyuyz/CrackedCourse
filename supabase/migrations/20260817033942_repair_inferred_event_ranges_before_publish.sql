-- Repair ranges such as "11:30-2:30 pm" that older extraction runs
-- interpreted as 23:30-14:30. Only the latest reviewed run is normalized.
create or replace function public.publish_course(p_course_id uuid)
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

  update public.extraction_items
  set current_payload = jsonb_set(
        current_payload,
        '{startTime}',
        to_jsonb(
          to_char(
            ((current_payload ->> 'startTime')::time - interval '12 hours')::time,
            'HH24:MI'
          )
        )
      ),
      updated_at = now()
  where run_id = latest_run_id
    and course_id = p_course_id
    and owner_id = (select auth.uid())
    and item_type = 'event'
    and review_status in ('confirmed', 'edited')
    and coalesce((current_payload ->> 'isAllDay')::boolean, true) = false
    and nullif(current_payload ->> 'startTime', '') is not null
    and nullif(current_payload ->> 'endTime', '') is not null
    and nullif(current_payload ->> 'startDate', '') is not null
    and coalesce(
          nullif(current_payload ->> 'endDate', ''),
          current_payload ->> 'startDate'
        ) = current_payload ->> 'startDate'
    and (current_payload ->> 'startTime')::time
          > (current_payload ->> 'endTime')::time
    and (current_payload ->> 'startTime')::time >= time '13:00'
    and (current_payload ->> 'endTime')::time >= time '12:00'
    and (((current_payload ->> 'startTime')::time - interval '12 hours')::time)
          < (current_payload ->> 'endTime')::time;

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

revoke all on function public.publish_course(uuid) from public, anon;
grant execute on function public.publish_course(uuid) to authenticated;
