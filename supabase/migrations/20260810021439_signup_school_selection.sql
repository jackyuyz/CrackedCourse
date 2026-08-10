create policy institutions_select_anon
on public.institutions for select
to anon
using (is_active);

grant select (
  id,
  canonical_name,
  city,
  region_code,
  country_code,
  default_time_zone,
  search_text,
  is_active
) on public.institutions to anon;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_institution_id uuid;
  selected_institution_name text;
  requested_institution_id text;
  email_domain text;
begin
  requested_institution_id := nullif(
    trim(new.raw_user_meta_data ->> 'default_institution_id'),
    ''
  );
  email_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  select institution.id, institution.canonical_name
  into selected_institution_id, selected_institution_name
  from public.institutions institution
  where institution.is_active
    and (
      institution.id::text = requested_institution_id
      or (
        requested_institution_id is null
        and institution.domain is not null
        and (
          email_domain = institution.domain
          or email_domain like ('%.' || institution.domain)
        )
      )
    )
  order by case
    when institution.id::text = requested_institution_id then 0
    else 1
  end
  limit 1;

  insert into public.profiles (
    id,
    display_name,
    time_zone,
    institution_name,
    default_institution_id
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'America/New_York',
    selected_institution_name,
    selected_institution_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
