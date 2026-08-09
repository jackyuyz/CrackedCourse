alter table public.profiles
  alter column time_zone set default 'America/New_York';

alter table public.courses
  alter column time_zone set default 'America/New_York';

update public.profiles
set time_zone = 'America/New_York'
where time_zone is distinct from 'America/New_York';

alter table public.profiles
  add constraint profiles_time_zone_fixed_check
  check (time_zone = 'America/New_York');

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, time_zone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'America/New_York'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
