-- These helpers run only inside the restricted billing API.
create function public.office_billing_actor()
returns text language sql stable security definer set search_path = '' as $$
  select w.worker_id
  from public.worker_workspaces w
  join auth.users u on u.id = auth.uid() and lower(u.email) = w.email
  where u.email_confirmed_at is not null and
    (w.worker_id, w.email) in (
      ('admin','tadmin@rassuly-eng.co.il'),
      ('shahar','tshaharw@rassuly-eng.co.il'),
      ('nave','tnave@rassuly-eng.co.il')
    )
$$;
revoke all on function public.office_billing_actor() from public, anon, authenticated;

create function public.office_billing_projects(actor text)
returns table (id text, name text, client text, manager text, owner_id text, active boolean)
language sql stable security definer set search_path = '' as $$
  select p->>'id', p->>'name', p->>'client', w.data #>> '{workers,0,name}',
         w.worker_id, coalesce(p->>'status' = 'פעיל', false)
  from public.worker_workspaces w
  cross join lateral jsonb_array_elements(w.data->'projects') p
  where w.worker_id in ('admin','shahar','nave')
    and (actor = 'admin' or w.worker_id = actor)
    and exists (
      select 1 from jsonb_array_elements(w.data->'project_assignments') a
      where a->>'project_id' = p->>'id' and a->>'worker_id' = w.worker_id
    )
$$;
revoke all on function public.office_billing_projects(text) from public, anon, authenticated;

create function public.office_billing_read(selected_month date, months_back integer default 3)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor text := public.office_billing_actor();
  manager_access boolean := actor = 'admin';
  first_month date;
  current_month date := date_trunc('month', now() at time zone 'Asia/Jerusalem')::date;
begin
  if actor is null then raise exception 'billing_access_denied'; end if;
  if selected_month is null or extract(day from selected_month) <> 1
     or months_back is null or months_back not between 0 and 24 then
    raise exception 'billing_invalid_period';
  end if;
  first_month := (selected_month - make_interval(months => months_back))::date;
  return jsonb_build_object(
    'admin', manager_access,
    'current_month', current_month,
    'projects', coalesce((select jsonb_agg(p order by p.name) from public.office_billing_projects(actor) p), '[]'),
    'cycles', coalesce((select jsonb_agg(c) from public.office_billing_cycles c
      where c.month between first_month and selected_month), '[]'),
    'forecasts', coalesce((select jsonb_agg(
      case when manager_access or c.step = 4 then to_jsonb(f)
      else to_jsonb(f) - 'decision' end)
      from public.office_billing_forecasts f
      join public.office_billing_cycles c using (month)
      where f.month between first_month and selected_month
        and (manager_access or f.month = current_month or (c.step = 4 and c.employee_history))
        and exists (select 1 from public.office_billing_projects(actor) p where p.id = f.project_id)), '[]'),
    'invoices', coalesce((select jsonb_agg(
      case when manager_access then to_jsonb(i)
      when c.employee_amounts then to_jsonb(i) - 'notes' - 'number'
      else jsonb_build_object('month',i.month,'project_id',i.project_id,'status',i.status) end)
      from public.office_billing_invoices i join public.office_billing_cycles c using (month)
      where i.month between first_month and selected_month
        and (manager_access or (c.step = 4 and (i.month = current_month or c.employee_history)))
        and exists (select 1 from public.office_billing_projects(actor) p where p.id = i.project_id)), '[]'),
    'documents', case when manager_access then coalesce((select jsonb_agg(d order by d.uploaded_at desc)
      from public.office_billing_documents d join public.office_billing_invoices i on i.id = d.invoice_id
      where i.month between first_month and selected_month
        and exists (select 1 from public.office_billing_projects(actor) p where p.id = i.project_id)), '[]') else '[]'::jsonb end,
    'audit', case when manager_access then coalesce((select jsonb_agg(a order by a.created_at desc)
      from public.office_billing_audit a where a.month between first_month and selected_month), '[]') else '[]'::jsonb end
  );
end;
$$;

create function public.office_billing_write(action text, billing_month date, project text default null, input jsonb default '{}')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor text := public.office_billing_actor();
  cycle public.office_billing_cycles;
  invoice public.office_billing_invoices;
  forecast public.office_billing_forecasts;
  next_step integer;
  previous jsonb;
  details jsonb := '{}';
  object_path text;
begin
  if actor is null or (actor <> 'admin' and action <> 'forecast') then raise exception 'billing_access_denied'; end if;
  if billing_month is null or extract(day from billing_month) <> 1 then raise exception 'billing_invalid_period'; end if;
  if action in ('forecast','review','invoice','document') and not exists (
    select 1 from public.office_billing_projects(actor) p where p.id = project
  ) then raise exception 'billing_access_denied'; end if;
  if actor <> 'admin' and billing_month <> date_trunc('month', now() at time zone 'Asia/Jerusalem')::date then
    raise exception 'billing_forecast_closed';
  end if;

  if actor = 'admin' then
    insert into public.office_billing_cycles(month) values (billing_month) on conflict do nothing;
  end if;
  select * into cycle from public.office_billing_cycles c where c.month = billing_month for update;
  if not found then raise exception 'billing_forecast_closed'; end if;

  case action
    when 'step' then
      next_step := (input->>'step')::integer;
      if (input->>'previous')::integer is distinct from cycle.step
         or next_step is null or next_step not between 1 and 4
         or abs(next_step - cycle.step) <> 1
         or cycle.step = 4
         or (next_step < cycle.step and coalesce(length(trim(input->>'reason')),0) = 0) then
        raise exception 'billing_invalid_transition';
      end if;
      if next_step = 4 and exists (
        select 1 from public.office_billing_forecasts f where f.month = billing_month and f.expected and f.decision is null
      ) then raise exception 'billing_unreviewed_forecasts'; end if;
      update public.office_billing_cycles set step = next_step where month = billing_month;
      details := jsonb_build_object('from', cycle.step, 'to', next_step, 'reason', left(input->>'reason', 1000));
    when 'visibility' then
      update public.office_billing_cycles
      set employee_history = coalesce((input->>'history')::boolean, false),
          employee_amounts = coalesce((input->>'amounts')::boolean, false)
      where month = billing_month;
      details := input;
    when 'forecast' then
      if cycle.step <> 2 or jsonb_typeof(input->'expected') is distinct from 'boolean'
         or not exists (select 1 from public.office_billing_projects(actor) p where p.id = project and p.active)
        then raise exception 'billing_forecast_closed'; end if;
      insert into public.office_billing_forecasts(month, project_id, expected, updated_by)
      values (billing_month, project, (input->>'expected')::boolean, auth.uid())
      on conflict (month, project_id) do update set expected = excluded.expected,
        updated_by = excluded.updated_by, updated_at = now(), decision = null;
      details := jsonb_build_object('expected', input->'expected');
    when 'review' then
      if cycle.step <> 3 or coalesce(input->>'decision','') not in ('approved','excluded') then
        raise exception 'billing_review_closed';
      end if;
      update public.office_billing_forecasts set decision = input->>'decision'
      where month = billing_month and project_id = project returning * into forecast;
      if not found then raise exception 'billing_forecast_missing'; end if;
      details := jsonb_build_object('decision', forecast.decision);
    when 'invoice' then
      select * into invoice from public.office_billing_invoices
      where month = billing_month and project_id = project;
      if coalesce(invoice.revision,0) is distinct from (input->>'revision')::integer then
        raise exception 'billing_revision_conflict';
      end if;
      previous := to_jsonb(invoice);
      insert into public.office_billing_invoices(month,project_id,status,number,submitted_amount,approved_amount,submitted_on,approved_on,notes)
      values (billing_month,project,input->>'status',left(coalesce(input->>'number',''),100),
        (input->>'submitted_amount')::numeric,(input->>'approved_amount')::numeric,
        (input->>'submitted_on')::date,(input->>'approved_on')::date,left(coalesce(input->>'notes',''),5000))
      on conflict (month,project_id) do update set status = excluded.status, number = excluded.number,
        submitted_amount = excluded.submitted_amount, approved_amount = excluded.approved_amount,
        submitted_on = excluded.submitted_on, approved_on = excluded.approved_on, notes = excluded.notes,
        revision = office_billing_invoices.revision + 1
      returning * into invoice;
      details := jsonb_build_object('previous',previous,'invoice',to_jsonb(invoice));
    when 'document' then
      select * into invoice from public.office_billing_invoices where month = billing_month and project_id = project;
      object_path := input->>'path';
      if invoice.id is null or object_path is null
         or split_part(object_path,'/',1) <> invoice.id::text
         or not exists (select 1 from storage.objects o where o.bucket_id = 'office-billing-private' and o.name = object_path)
         or coalesce(length(input->>'name'),0) not between 1 and 255 then
        raise exception 'billing_invalid_document';
      end if;
      insert into public.office_billing_documents(invoice_id,path,original_name,uploaded_by)
      values (invoice.id,object_path,input->>'name',auth.uid())
      on conflict (path) do nothing;
      if not found then return jsonb_build_object('ok',true); end if;
      details := jsonb_build_object('name',input->>'name','path',object_path);
    else raise exception 'billing_invalid_action';
  end case;
  insert into public.office_billing_audit(month,project_id,actor,action,details)
  values (billing_month,project,auth.uid(),action,details);
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.office_billing_read(date, integer), public.office_billing_write(text,date,text,jsonb) from public, anon;
grant execute on function public.office_billing_read(date, integer), public.office_billing_write(text,date,text,jsonb) to authenticated;
