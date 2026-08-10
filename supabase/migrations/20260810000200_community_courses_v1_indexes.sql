create extension if not exists pg_trgm with schema extensions;

create index profiles_default_institution_idx
on public.profiles (default_institution_id)
where default_institution_id is not null;

create index courses_imported_publication_idx
on public.courses (imported_from_publication_id)
where imported_from_publication_id is not null;

create index community_publications_owner_idx
on public.community_publications (owner_id, updated_at desc);

create index community_endorsements_user_idx
on public.community_endorsements (user_id, created_at desc);

create index community_imports_course_idx
on public.community_imports (course_id);

create index community_reports_reporter_idx
on public.community_reports (reporter_id, created_at desc);

create index institutions_search_trgm_idx
on public.institutions using gin (search_text extensions.gin_trgm_ops)
where is_active;
