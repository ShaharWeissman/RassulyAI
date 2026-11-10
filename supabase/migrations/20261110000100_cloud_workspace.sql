-- Each portfolio is owned by one worker. All access is through authenticated RPCs.
create table public.worker_workspaces (
  worker_id text primary key,
  email text not null unique,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.worker_workspaces enable row level security;
revoke all on public.worker_workspaces from anon, authenticated;

create function public.load_workspace()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare result jsonb;
begin
  select jsonb_build_object('data', w.data, 'revision', w.revision)
  into result
  from public.worker_workspaces w
  join auth.users u on lower(u.email) = w.email
  where u.id = auth.uid() and u.email_confirmed_at is not null;
  if result is null then raise exception 'workspace_access_denied'; end if;
  return result;
end;
$$;

create function public.save_workspace(payload jsonb, expected_revision integer)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  current_row public.worker_workspaces;
  collection text;
  row_data jsonb;
  project_ids jsonb;
begin
  select w.* into current_row
  from public.worker_workspaces w
  join auth.users u on lower(u.email) = w.email
  where u.id = auth.uid() and u.email_confirmed_at is not null
  for update of w;
  if not found then raise exception 'workspace_access_denied'; end if;
  -- A retry after a lost response is safe.
  if payload = current_row.data then return current_row.revision; end if;
  if expected_revision is distinct from current_row.revision then
    raise exception 'revision_conflict';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
     or octet_length(payload::text) > 5000000 then
    raise exception 'invalid_workspace';
  end if;
  foreach collection in array array['workers', 'project_assignments', 'vehicles'] loop
    if payload->collection is distinct from current_row.data->collection then
      raise exception 'immutable_membership';
    end if;
  end loop;
  select jsonb_agg(p->>'id') into project_ids
  from jsonb_array_elements(current_row.data->'projects') p;
  foreach collection in array array[
    'projects', 'office_project_status', 'requirements_tasks', 'project_costs',
    'protocols', 'project_status_updates', 'mileage_entries', 'leave_requests'
  ] loop
    if jsonb_typeof(payload->collection) is distinct from 'array' then
      raise exception 'invalid_collection';
    end if;
    for row_data in select * from jsonb_array_elements(payload->collection) loop
      if jsonb_typeof(row_data) <> 'object' then raise exception 'invalid_record'; end if;
      if collection in ('mileage_entries', 'leave_requests') then
        if row_data->>'worker_id' is distinct from current_row.worker_id then
          raise exception 'worker_access_denied';
        end if;
      elsif collection = 'projects' then
        if not coalesce(project_ids ? (row_data->>'id'), false) then
          raise exception 'project_access_denied';
        end if;
      elsif not coalesce(project_ids ? (row_data->>'project_id'), false) then
        raise exception 'project_access_denied';
      end if;
    end loop;
  end loop;
  -- Assigned projects cannot be removed or duplicated through the client.
  if (select jsonb_agg(p->>'id' order by p->>'id') from jsonb_array_elements(payload->'projects') p)
     is distinct from
     (select jsonb_agg(p->>'id' order by p->>'id') from jsonb_array_elements(current_row.data->'projects') p) then
    raise exception 'immutable_projects';
  end if;
  update public.worker_workspaces
  set data = payload, revision = revision + 1, updated_at = now()
  where worker_id = current_row.worker_id
  returning revision into expected_revision;
  return expected_revision;
end;
$$;

revoke all on function public.load_workspace() from public, anon;
revoke all on function public.save_workspace(jsonb, integer) from public, anon;
grant execute on function public.load_workspace() to authenticated;
grant execute on function public.save_workspace(jsonb, integer) to authenticated;
