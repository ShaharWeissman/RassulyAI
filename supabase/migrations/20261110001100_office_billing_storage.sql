insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('office-billing-private','office-billing-private',false,10485760,
  array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from storage.buckets where id = 'office-billing-private'
    and (public is distinct from false or file_size_limit is distinct from 10485760
      or allowed_mime_types is distinct from array['application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])) then
    raise exception 'office_billing_bucket_configuration_conflict';
  end if;
end;
$$;

create function public.office_billing_storage_allowed(object_path text, linked_only boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.office_billing_actor() = 'admin',false)
    and exists (select 1 from public.office_billing_invoices i
      where split_part(object_path,'/',1) = i.id::text
        and exists (select 1 from public.office_billing_projects('admin') p where p.id = i.project_id))
    and case when linked_only then exists (
      select 1 from public.office_billing_documents d where d.path = object_path)
      else object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|xlsx)$' end
$$;
revoke all on function public.office_billing_storage_allowed(text,boolean) from public, anon;
grant execute on function public.office_billing_storage_allowed(text,boolean) to authenticated;

create policy office_billing_upload on storage.objects for insert to authenticated
with check (bucket_id = 'office-billing-private' and public.office_billing_storage_allowed(name,false));
create policy office_billing_download on storage.objects for select to authenticated
using (bucket_id = 'office-billing-private' and public.office_billing_storage_allowed(name,true));

-- Protect this bucket even if other modules have broad permissive policies.
create policy office_billing_insert_guard on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'office-billing-private' or public.office_billing_storage_allowed(name,false));
create policy office_billing_select_guard on storage.objects as restrictive for select to authenticated
using (bucket_id <> 'office-billing-private' or public.office_billing_storage_allowed(name,true));
create policy office_billing_immutable_versions on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'office-billing-private') with check (bucket_id <> 'office-billing-private');
create policy office_billing_prevent_client_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'office-billing-private');
create policy office_billing_prevent_anonymous_read on storage.objects as restrictive for select to anon
using (bucket_id <> 'office-billing-private');
create policy office_billing_prevent_anonymous_upload on storage.objects as restrictive for insert to anon
with check (bucket_id <> 'office-billing-private');
