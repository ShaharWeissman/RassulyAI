create table public.company_project_transfer_transactions (id bigint primary key);
revoke all on public.company_project_transfer_transactions from public, anon, authenticated;
alter table public.company_project_transfer_transactions enable row level security;

-- Allow manager-task records to move intact only during the trusted transfer.
create function public.skip_manager_task_guard_during_transfer()
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.company_project_transfer_transactions where id = txid_current()
  )
$$;
revoke all on function public.skip_manager_task_guard_during_transfer() from public, anon;
grant execute on function public.skip_manager_task_guard_during_transfer() to authenticated;

drop trigger protect_project_manager_tasks on public.worker_workspaces;
create trigger protect_project_manager_tasks before update of data on public.worker_workspaces
for each row when (public.skip_manager_task_guard_during_transfer())
execute function public.protect_project_manager_tasks();

create function public.company_projects_list()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if public.office_billing_actor() is null then raise exception 'workspace_access_denied'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p->>'id', 'name', p->>'name', 'client', p->>'client', 'status', p->>'status',
      'owner_id', w.worker_id, 'owner_name', w.data #>> '{workers,0,name}',
      'updated_at', coalesce(office.updated_at, ''), 'transferred_from', p->>'transferred_from'
    ) order by p->>'name', p->>'id')
    from public.worker_workspaces w
    cross join lateral jsonb_array_elements(w.data->'projects') p
    left join lateral (
      select item->>'updated_at' as updated_at
      from jsonb_array_elements(w.data->'office_project_status') item
      where item->>'project_id' = p->>'id'
      limit 1
    ) office on true
    where w.worker_id in ('admin', 'shahar', 'nave')
      and exists (
        select 1 from jsonb_array_elements(w.data->'project_assignments') a
        where a->>'project_id' = p->>'id' and a->>'worker_id' = w.worker_id
      )
  ), '[]'::jsonb);
end;
$$;

create function public.company_project_pull(project_id text, expected_owner text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor text := public.office_billing_actor();
  source_data jsonb;
  destination_data jsonb;
  moving jsonb;
  remaining jsonb;
  collection text;
  id_key text;
  new_revision integer;
begin
  if actor is null or expected_owner is null or expected_owner not in ('admin', 'shahar', 'nave')
     or expected_owner = actor or coalesce(length(project_id), 0) not between 1 and 200 then
    raise exception 'workspace_access_denied';
  end if;
  perform 1 from public.worker_workspaces
    where worker_id in (actor, expected_owner) order by worker_id for update;
  select data into source_data from public.worker_workspaces where worker_id = expected_owner;
  select data into destination_data from public.worker_workspaces where worker_id = actor;
  if not exists (select 1 from jsonb_array_elements(source_data->'projects') p where p->>'id' = project_id)
     or not exists (
       select 1 from jsonb_array_elements(source_data->'project_assignments') a
       where a->>'project_id' = project_id and a->>'worker_id' = expected_owner
     ) or exists (select 1 from jsonb_array_elements(destination_data->'projects') p where p->>'id' = project_id) then
    raise exception 'project_owner_changed';
  end if;

  foreach collection in array array[
    'projects', 'project_assignments', 'office_project_status', 'project_status_updates',
    'requirements_tasks', 'project_costs', 'protocols'
  ] loop
    id_key := case when collection = 'projects' then 'id' else 'project_id' end;
    select
      coalesce(jsonb_agg(
        case collection
          when 'projects' then item || jsonb_build_object('transferred_from', source_data #>> '{workers,0,name}')
          when 'project_assignments' then item || jsonb_build_object('worker_id', actor)
          else item
        end order by ordinal
      ) filter (where item->>id_key = project_id), '[]'::jsonb),
      coalesce(jsonb_agg(item order by ordinal)
        filter (where item->>id_key is distinct from project_id), '[]'::jsonb)
    into moving, remaining
    from jsonb_array_elements(source_data->collection) with ordinality as rows(item, ordinal);
    source_data := jsonb_set(source_data, array[collection], remaining);
    destination_data := jsonb_set(destination_data, array[collection], (destination_data->collection) || moving);
  end loop;
  if octet_length(destination_data::text) > 5000000 then raise exception 'invalid_workspace'; end if;

  insert into public.company_project_transfer_transactions values (txid_current());
  update public.worker_workspaces set data = source_data, revision = revision + 1, updated_at = now()
    where worker_id = expected_owner;
  update public.worker_workspaces set data = destination_data, revision = revision + 1, updated_at = now()
    where worker_id = actor returning revision into new_revision;
  delete from public.company_project_transfer_transactions where id = txid_current();
  return jsonb_build_object('data', destination_data, 'revision', new_revision);
end;
$$;

revoke all on function public.company_projects_list(), public.company_project_pull(text, text) from public, anon;
grant execute on function public.company_projects_list(), public.company_project_pull(text, text) to authenticated;
