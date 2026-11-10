create table public.organization_tasks (
  id uuid primary key default gen_random_uuid(),
  worker_id text not null references public.worker_workspaces(worker_id),
  kind text not null check (kind in ('manager','personal')),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 3000),
  status text not null default 'פתוח' check (status in ('פתוח','בטיפול','בוצע')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organization_tasks_worker on public.organization_tasks(worker_id, kind, status);
alter table public.organization_tasks enable row level security;
revoke all on public.organization_tasks from public, anon, authenticated;

-- Resolve the caller through the existing confirmed-account policy.
create function public.organization_tasks_read()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare actor text := public.load_workspace() #>> '{data,workers,0,id}';
begin
  if actor is null then raise exception 'task_access_denied'; end if;
  return jsonb_build_object(
    'tasks', coalesce((select jsonb_agg(to_jsonb(t) - 'created_by' order by t.created_at desc)
      from public.organization_tasks t where actor = 'admin' or t.worker_id = actor), '[]'::jsonb),
    'workers', coalesce((select jsonb_agg(jsonb_build_object('id',w.worker_id,'name',w.data #>> '{workers,0,name}') order by w.worker_id)
      from public.worker_workspaces w
      where w.worker_id <> 'admin'
        and w.email in ('tnave@rassuly-eng.co.il','tshaharw@rassuly-eng.co.il')
        and (actor = 'admin' or w.worker_id = actor)), '[]'::jsonb)
  );
end;
$$;

create function public.organization_tasks_write(action text, task_id uuid default null, input jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor text := public.load_workspace() #>> '{data,workers,0,id}';
  task public.organization_tasks;
  assignee text;
begin
  if actor is null then raise exception 'task_access_denied'; end if;
  if action = 'create' then
    assignee := case when actor = 'admin' then input->>'worker_id' else actor end;
    if not exists (select 1 from public.worker_workspaces w where w.worker_id = assignee
      and w.email in ('tnave@rassuly-eng.co.il','tshaharw@rassuly-eng.co.il')) then
      raise exception 'task_access_denied';
    end if;
    insert into public.organization_tasks(worker_id,kind,title,description,status,created_by)
    values (assignee,case when actor = 'admin' then 'manager' else 'personal' end,
      trim(input->>'title'),coalesce(input->>'description',''),
      case when actor = 'admin' then 'פתוח' else coalesce(input->>'status','פתוח') end,auth.uid());
    return;
  end if;

  select * into task from public.organization_tasks t where t.id = task_id for update;
  if not found or (actor <> 'admin' and task.worker_id <> actor) then
    raise exception 'task_access_denied';
  end if;
  if actor = 'admin' and task.kind <> 'manager' then raise exception 'task_access_denied'; end if;
  if action = 'status' then
    update public.organization_tasks set status = input->>'status', updated_at = now() where id = task_id;
  elsif action = 'edit' and ((actor = 'admin' and task.kind = 'manager') or (actor = task.worker_id and task.kind = 'personal')) then
    update public.organization_tasks set title = trim(input->>'title'),
      description = coalesce(input->>'description',''), updated_at = now() where id = task_id;
  else raise exception 'task_access_denied';
  end if;
end;
$$;
revoke all on function public.organization_tasks_read(), public.organization_tasks_write(text,uuid,jsonb) from public, anon;
grant execute on function public.organization_tasks_read(), public.organization_tasks_write(text,uuid,jsonb) to authenticated;

-- Existing project-level manager instructions remain readable by workers.
create function public.protect_project_manager_instructions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null
     and exists (
       select 1 from jsonb_array_elements(old.data->'projects') p
       join jsonb_array_elements(new.data->'projects') n on n->>'id' = p->>'id'
       where p->>'manager_tasks' is distinct from n->>'manager_tasks'
     )
     and not exists (select 1 from auth.users u where u.id = auth.uid()
       and u.email_confirmed_at is not null and lower(u.email) = 'tadmin@rassuly-eng.co.il') then
    raise exception 'manager_instructions_read_only';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_project_manager_instructions() from public, anon, authenticated;
create trigger protect_project_manager_instructions before update of data on public.worker_workspaces
for each row execute function public.protect_project_manager_instructions();
