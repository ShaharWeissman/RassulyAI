insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contractor-schedules', 'contractor-schedules', false, 12000000,
  array['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

create function public.contractor_schedule_allowed(object_path text, linked_only boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select object_path ~ '^[a-zA-Z0-9_-]+/[0-9a-f-]{36}\.(xlsx|csv|pdf)$'
    and exists (
      select 1
      from public.worker_workspaces w
      cross join lateral jsonb_array_elements(w.data->'projects') p
      cross join (select public.office_billing_actor() as actor) session
      where (session.actor = 'admin' or session.actor = w.worker_id)
        and p->>'id' = split_part(object_path, '/', 1)
        and exists (
          select 1 from jsonb_array_elements(w.data->'project_assignments') a
          where a->>'project_id' = p->>'id' and a->>'worker_id' = w.worker_id
        )
        and (not linked_only or p #>> '{schedule,contractor,original,path}' = object_path)
    )
$$;
revoke all on function public.contractor_schedule_allowed(text, boolean) from public, anon;
grant execute on function public.contractor_schedule_allowed(text, boolean) to authenticated;

create policy contractor_schedule_insert on storage.objects for insert to authenticated
with check (bucket_id = 'contractor-schedules' and public.contractor_schedule_allowed(name, false));
create policy contractor_schedule_select on storage.objects for select to authenticated
using (bucket_id = 'contractor-schedules' and public.contractor_schedule_allowed(name, true));
create policy contractor_schedule_insert_guard on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'contractor-schedules' or public.contractor_schedule_allowed(name, false));
create policy contractor_schedule_select_guard on storage.objects as restrictive for select to authenticated
using (bucket_id <> 'contractor-schedules' or public.contractor_schedule_allowed(name, true));
create policy contractor_schedule_anonymous_read on storage.objects as restrictive for select to anon
using (bucket_id <> 'contractor-schedules');
create policy contractor_schedule_anonymous_write on storage.objects as restrictive for insert to anon
with check (bucket_id <> 'contractor-schedules');
create policy contractor_schedule_immutable on storage.objects as restrictive for update to authenticated, anon
using (bucket_id <> 'contractor-schedules') with check (bucket_id <> 'contractor-schedules');
create policy contractor_schedule_delete_guard on storage.objects as restrictive for delete to authenticated, anon
using (bucket_id <> 'contractor-schedules');
