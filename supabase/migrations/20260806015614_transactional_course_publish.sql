create unique index course_people_source_item_unique
on public.course_people (source_item_id)
where source_item_id is not null;

create unique index office_hours_source_item_unique
on public.office_hours (source_item_id)
where source_item_id is not null;

create unique index calendar_events_source_item_unique
on public.calendar_events (source_item_id)
where source_item_id is not null;

create unique index grading_categories_source_item_unique
on public.grading_categories (source_item_id)
where source_item_id is not null;

create unique index grading_policies_source_item_unique
on public.grading_policies (source_item_id)
where source_item_id is not null;

create function public.publish_course(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  review_item record;
  course_time_zone text;
  grading_total numeric;
  grading_count integer;
  next_display_order integer := 0;
begin
  select time_zone
  into course_time_zone
  from public.courses
  where id = p_course_id
    and owner_id = (select auth.uid())
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'COURSE_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.extraction_items
    where course_id = p_course_id
      and owner_id = (select auth.uid())
      and review_status = 'pending'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'REVIEW_INCOMPLETE';
  end if;

  select
    count(*),
    coalesce(sum((current_payload ->> 'weightPercent')::numeric), 0)
  into grading_count, grading_total
  from public.extraction_items
  where course_id = p_course_id
    and owner_id = (select auth.uid())
    and item_type = 'grading_category'
    and review_status in ('confirmed', 'edited');

  if grading_count > 0 and (grading_total < 99.5 or grading_total > 100.5) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GRADING_WEIGHTS';
  end if;

  for review_item in
    select id, item_type, current_payload
    from public.extraction_items
    where course_id = p_course_id
      and owner_id = (select auth.uid())
      and review_status in ('confirmed', 'edited')
    order by created_at, id
  loop
    case review_item.item_type
      when 'course_field' then
        case review_item.current_payload ->> 'field'
          when 'code' then
            update public.courses
            set code = review_item.current_payload ->> 'value'
            where id = p_course_id;
          when 'title' then
            update public.courses
            set title = review_item.current_payload ->> 'value'
            where id = p_course_id;
          when 'section' then
            update public.courses
            set section = review_item.current_payload ->> 'value'
            where id = p_course_id;
          when 'term' then
            update public.courses
            set term_name = review_item.current_payload ->> 'value'
            where id = p_course_id;
          when 'timeZone' then
            update public.courses
            set time_zone = review_item.current_payload ->> 'value'
            where id = p_course_id;
            course_time_zone := review_item.current_payload ->> 'value';
          else
            null;
        end case;

      when 'person' then
        insert into public.course_people (
          course_id,
          owner_id,
          name,
          role,
          email,
          office_location,
          source_item_id
        )
        values (
          p_course_id,
          (select auth.uid()),
          review_item.current_payload ->> 'name',
          (review_item.current_payload ->> 'role')::public.person_role,
          nullif(review_item.current_payload ->> 'email', ''),
          nullif(review_item.current_payload ->> 'officeLocation', ''),
          review_item.id
        )
        on conflict (source_item_id) where source_item_id is not null
        do update set
          name = excluded.name,
          role = excluded.role,
          email = excluded.email,
          office_location = excluded.office_location;

      when 'office_hour' then
        insert into public.office_hours (
          course_id,
          owner_id,
          recurrence_text,
          day_of_week,
          start_time,
          end_time,
          start_date,
          end_date,
          time_zone,
          location,
          meeting_url,
          is_calendar_ready,
          source_item_id
        )
        values (
          p_course_id,
          (select auth.uid()),
          nullif(review_item.current_payload ->> 'recurrenceText', ''),
          nullif(review_item.current_payload ->> 'dayOfWeek', '')::smallint,
          nullif(review_item.current_payload ->> 'startTime', '')::time,
          nullif(review_item.current_payload ->> 'endTime', '')::time,
          nullif(review_item.current_payload ->> 'startDate', '')::date,
          nullif(review_item.current_payload ->> 'endDate', '')::date,
          coalesce(nullif(review_item.current_payload ->> 'timeZone', ''), course_time_zone),
          nullif(review_item.current_payload ->> 'location', ''),
          nullif(review_item.current_payload ->> 'meetingUrl', ''),
          (
            nullif(review_item.current_payload ->> 'dayOfWeek', '') is not null
            and nullif(review_item.current_payload ->> 'startTime', '') is not null
            and nullif(review_item.current_payload ->> 'startDate', '') is not null
            and nullif(review_item.current_payload ->> 'endDate', '') is not null
          ),
          review_item.id
        )
        on conflict (source_item_id) where source_item_id is not null
        do update set
          recurrence_text = excluded.recurrence_text,
          day_of_week = excluded.day_of_week,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          time_zone = excluded.time_zone,
          location = excluded.location,
          meeting_url = excluded.meeting_url,
          is_calendar_ready = excluded.is_calendar_ready;

      when 'event' then
        insert into public.calendar_events (
          course_id,
          owner_id,
          title,
          event_type,
          starts_at,
          ends_at,
          start_date,
          end_date,
          is_all_day,
          time_zone,
          location,
          status,
          source_item_id,
          ical_uid
        )
        values (
          p_course_id,
          (select auth.uid()),
          review_item.current_payload ->> 'title',
          (review_item.current_payload ->> 'type')::public.event_type,
          case
            when coalesce((review_item.current_payload ->> 'isAllDay')::boolean, true) then null
            else (
              (review_item.current_payload ->> 'startDate')::date
              + (review_item.current_payload ->> 'startTime')::time
            ) at time zone course_time_zone
          end,
          case
            when coalesce((review_item.current_payload ->> 'isAllDay')::boolean, true)
              or nullif(review_item.current_payload ->> 'endTime', '') is null then null
            else (
              coalesce(
                nullif(review_item.current_payload ->> 'endDate', ''),
                review_item.current_payload ->> 'startDate'
              )::date
              + (review_item.current_payload ->> 'endTime')::time
            ) at time zone course_time_zone
          end,
          case
            when coalesce((review_item.current_payload ->> 'isAllDay')::boolean, true)
            then (review_item.current_payload ->> 'startDate')::date
            else null
          end,
          case
            when coalesce((review_item.current_payload ->> 'isAllDay')::boolean, true)
            then nullif(review_item.current_payload ->> 'endDate', '')::date
            else null
          end,
          coalesce((review_item.current_payload ->> 'isAllDay')::boolean, true),
          course_time_zone,
          nullif(review_item.current_payload ->> 'location', ''),
          'confirmed',
          review_item.id,
          review_item.id::text || '@crackedcourse'
        )
        on conflict (source_item_id) where source_item_id is not null
        do update set
          title = excluded.title,
          event_type = excluded.event_type,
          starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          is_all_day = excluded.is_all_day,
          time_zone = excluded.time_zone,
          location = excluded.location;

      when 'grading_category' then
        insert into public.grading_categories (
          course_id,
          owner_id,
          name,
          weight_percent,
          aggregation_mode,
          display_order,
          source_item_id
        )
        values (
          p_course_id,
          (select auth.uid()),
          review_item.current_payload ->> 'name',
          (review_item.current_payload ->> 'weightPercent')::numeric,
          'points',
          next_display_order,
          review_item.id
        )
        on conflict (source_item_id) where source_item_id is not null
        do update set
          name = excluded.name,
          weight_percent = excluded.weight_percent,
          display_order = excluded.display_order;
        next_display_order := next_display_order + 1;

      when 'grading_policy' then
        insert into public.grading_policies (
          course_id,
          owner_id,
          kind,
          description,
          calculator_support,
          source_item_id
        )
        values (
          p_course_id,
          (select auth.uid()),
          review_item.current_payload ->> 'kind',
          review_item.current_payload ->> 'description',
          'unsupported',
          review_item.id
        )
        on conflict (source_item_id) where source_item_id is not null
        do update set
          kind = excluded.kind,
          description = excluded.description,
          calculator_support = excluded.calculator_support;
    end case;
  end loop;

  if exists (
    select 1
    from public.courses
    where id = p_course_id
      and (nullif(trim(code), '') is null or nullif(trim(title), '') is null)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'COURSE_DETAILS_REQUIRED';
  end if;

  update public.courses
  set status = 'active',
      published_at = coalesce(published_at, now())
  where id = p_course_id
    and owner_id = (select auth.uid());

  return p_course_id;
end;
$$;

revoke all on function public.publish_course(uuid) from public, anon;
grant execute on function public.publish_course(uuid) to authenticated;
