create table public.office_billing_cycles (
  month date primary key check (extract(day from month) = 1),
  step integer not null default 1 check (step between 1 and 4),
  employee_history boolean not null default false,
  employee_amounts boolean not null default false
);
create table public.office_billing_forecasts (
  month date references public.office_billing_cycles(month),
  project_id text,
  expected boolean not null,
  decision text check (decision in ('approved','excluded')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (month, project_id)
);
create table public.office_billing_invoices (
  id uuid primary key default gen_random_uuid(),
  month date not null references public.office_billing_cycles(month),
  project_id text not null,
  status text not null check (status in ('draft','submitted','pending','approved','partial','correction')),
  number text not null default '',
  submitted_amount numeric(14,2) check (submitted_amount >= 0 and submitted_amount <> 'NaN'::numeric),
  approved_amount numeric(14,2) check (approved_amount >= 0 and approved_amount <> 'NaN'::numeric),
  submitted_on date,
  approved_on date,
  notes text not null default '',
  revision integer not null default 1,
  unique (month, project_id)
);
create table public.office_billing_documents (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.office_billing_invoices(id),
  path text not null unique,
  original_name text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index office_billing_documents_invoice on public.office_billing_documents(invoice_id);
create table public.office_billing_audit (
  id bigint generated always as identity primary key,
  month date not null references public.office_billing_cycles(month),
  project_id text,
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index office_billing_audit_period on public.office_billing_audit(month, project_id, created_at desc);

alter table public.office_billing_cycles enable row level security;
alter table public.office_billing_forecasts enable row level security;
alter table public.office_billing_invoices enable row level security;
alter table public.office_billing_documents enable row level security;
alter table public.office_billing_audit enable row level security;
revoke all on public.office_billing_cycles, public.office_billing_forecasts,
  public.office_billing_invoices, public.office_billing_documents,
  public.office_billing_audit from anon, authenticated, public;
