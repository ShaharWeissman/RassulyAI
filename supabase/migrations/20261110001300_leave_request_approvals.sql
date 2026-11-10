-- Preserve existing requests and prevent employees from granting their own approval.
create function public.protect_leave_request_approvals()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_requests jsonb := old.data->'leave_requests';
  new_requests jsonb := new.data->'leave_requests';
begin
  if new_requests is not distinct from old_requests or auth.uid() is null
     or exists (select 1 from auth.users u where u.id = auth.uid()
       and lower(u.email) = 'tadmin@rassuly-eng.co.il' and u.email_confirmed_at is not null) then
    return new;
  end if;
  if jsonb_typeof(new_requests) is distinct from 'array' then
    raise exception 'invalid_leave_requests';
  end if;
  if exists (select 1 from jsonb_array_elements(old_requests) r
      where not exists (select 1 from jsonb_array_elements(new_requests) n where n = r))
     or exists (select 1 from jsonb_array_elements(new_requests) n
      group by n->>'id' having count(*) > 1)
     or exists (select 1 from jsonb_array_elements(new_requests) n
      where not exists (select 1 from jsonb_array_elements(old_requests) r where r = n)
        and (coalesce(n->>'id','') = '' or n->>'worker_id' is distinct from new.worker_id
          or n->>'status' is distinct from 'ממתין לאישור'
          or coalesce(n->>'kind','') not in ('מחלה','חופשה')
          or coalesce(n->>'from_date','') !~ '^\d{4}-\d{2}-\d{2}$'
          or coalesce(n->>'to_date','') !~ '^\d{4}-\d{2}-\d{2}$'
          or (n->>'from_date')::date > (n->>'to_date')::date)) then
    raise exception 'leave_request_change_denied';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_leave_request_approvals() from public, anon, authenticated;
create trigger protect_leave_request_approvals before update of data on public.worker_workspaces
for each row execute function public.protect_leave_request_approvals();

create function public.approve_leave_request(target_worker_id text, request_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  workspace public.worker_workspaces;
  request jsonb;
begin
  if public.load_workspace() #>> '{data,workers,0,id}' is distinct from 'admin'
     or target_worker_id not in ('shahar','nave') then
    raise exception 'leave_approval_denied';
  end if;
  select * into workspace from public.worker_workspaces w where w.worker_id = target_worker_id for update;
  if not found then raise exception 'leave_request_not_found'; end if;
  select r into request from jsonb_array_elements(workspace.data->'leave_requests') r
    where r->>'id' = request_id and r->>'worker_id' = target_worker_id;
  if not found then raise exception 'leave_request_not_found'; end if;
  if request->>'status' = 'אושר' then return; end if;
  if request->>'status' is distinct from 'ממתין לאישור'
     or coalesce(request->>'kind','') not in ('מחלה','חופשה') then
    raise exception 'leave_request_not_pending';
  end if;
  update public.worker_workspaces
  set data = jsonb_set(data, '{leave_requests}', (
      select jsonb_agg(case when r->>'id' = request_id and r->>'worker_id' = target_worker_id
        then r || jsonb_build_object('status','אושר','approved_at',now(),'approved_by',auth.uid())
        else r end order by position)
      from jsonb_array_elements(workspace.data->'leave_requests') with ordinality as requests(r,position)
    )), revision = revision + 1, updated_at = now()
  where worker_id = target_worker_id;
end;
$$;
revoke all on function public.approve_leave_request(text,text) from public, anon;
grant execute on function public.approve_leave_request(text,text) to authenticated;

create function public.submit_leave_request(input jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor text := public.load_workspace() #>> '{data,workers,0,id}';
  workspace public.worker_workspaces;
  request jsonb;
begin
  if actor is null or actor not in ('shahar','nave') then raise exception 'leave_request_change_denied'; end if;
  select * into workspace from public.worker_workspaces w where w.worker_id = actor for update;
  if not found then raise exception 'leave_request_change_denied'; end if;
  request := jsonb_build_object(
    'id', input->>'id', 'worker_id', actor, 'kind', input->>'kind',
    'from_date', input->>'from_date', 'to_date', input->>'to_date',
    'note', left(coalesce(input->>'note',''), 2000), 'status', 'ממתין לאישור'
  );
  if not exists (select 1 from jsonb_array_elements(workspace.data->'leave_requests') r where r->>'id' = request->>'id') then
    update public.worker_workspaces
    set data = jsonb_set(data, '{leave_requests}', coalesce(data->'leave_requests','[]'::jsonb) || jsonb_build_array(request)),
      revision = revision + 1, updated_at = now()
    where worker_id = actor returning * into workspace;
  end if;
  return jsonb_build_object('data',workspace.data,'revision',workspace.revision);
end;
$$;
revoke all on function public.submit_leave_request(jsonb) from public, anon;
grant execute on function public.submit_leave_request(jsonb) to authenticated;
