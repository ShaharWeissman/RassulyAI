-- Employees may move manager tasks between statuses but may not create,
-- remove, duplicate, or change the contents of those assignments.
create function public.protect_project_manager_tasks()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_tasks jsonb := old.data->'requirements_tasks';
  new_tasks jsonb := new.data->'requirements_tasks';
begin
  if new_tasks is not distinct from old_tasks or auth.uid() is null
     or exists (select 1 from auth.users u where u.id = auth.uid()
       and lower(u.email) = 'tadmin@rassuly-eng.co.il' and u.email_confirmed_at is not null) then
    return new;
  end if;
  if exists (
    select 1 from jsonb_array_elements(old_tasks) o where o->>'origin' = 'manager'
    and (
      (select count(*) from jsonb_array_elements(new_tasks) n where n->>'id' = o->>'id') <> 1
      or not exists (
        select 1 from jsonb_array_elements(new_tasks) n
        where n->>'id' = o->>'id'
          and (n - 'status') = (o - 'status')
          and (n = o or n->>'status' in ('פתוח','בטיפול','הושלם'))
      )
    )
  ) or exists (
    select 1 from jsonb_array_elements(new_tasks) n where n->>'origin' = 'manager'
    and not exists (select 1 from jsonb_array_elements(old_tasks) o where o->>'id' = n->>'id' and o->>'origin' = 'manager')
  ) then
    raise exception 'project_manager_task_edit_denied';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_project_manager_tasks() from public, anon, authenticated;
create trigger protect_project_manager_tasks before update of data on public.worker_workspaces
for each row execute function public.protect_project_manager_tasks();
