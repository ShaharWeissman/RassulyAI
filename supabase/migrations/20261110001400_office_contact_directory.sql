create table public.office_contacts (
  id integer primary key,
  name text not null,
  phone text not null,
  email text not null,
  specialty text not null default '',
  title text not null
);
alter table public.office_contacts enable row level security;
revoke all on public.office_contacts from public, anon, authenticated;

create function public.read_office_contacts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if public.load_workspace() #>> '{data,workers,0,id}' is null then
    raise exception 'contacts_access_denied';
  end if;
  return coalesce((select jsonb_agg(c order by c.id) from public.office_contacts c), '[]'::jsonb);
end;
$$;
revoke all on function public.read_office_contacts() from public, anon;
grant execute on function public.read_office_contacts() to authenticated;
