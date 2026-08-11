create index if not exists assessments_source_item_idx
on public.assessments (source_item_id)
where source_item_id is not null;
