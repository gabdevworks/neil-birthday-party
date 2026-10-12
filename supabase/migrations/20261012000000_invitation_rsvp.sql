-- Private invitation RSVP schema.
-- Direct table access is denied. The browser may call only the functions below.
-- Name search identifies a guest; it does not prove identity. Pre-issued invite
-- links (invitation_token_hash) are the stronger production check.

create extension if not exists pgcrypto;

create table if not exists public.guests (
  id text primary key,
  full_name text not null,
  invitation_token_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists guests_full_name_lower_idx
  on public.guests (lower(full_name));

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null unique references public.guests (id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitation_sessions (
  token text primary key,
  guest_id text not null references public.guests (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.invitation_sessions enable row level security;

revoke all on public.guests from anon, authenticated;
revoke all on public.rsvps from anon, authenticated;
revoke all on public.invitation_sessions from anon, authenticated;

create or replace function public.search_guests(p_query text)
returns table (id text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
begin
  if length(v_query) < 1 or length(v_query) > 80 then
    return;
  end if;

  return query
    select g.id, g.full_name
    from public.guests g
    where g.full_name ilike '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
    order by g.full_name
    limit 200;
end;
$$;

create or replace function public.open_invitation(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_token text;
begin
  select * into v_guest
  from public.guests g
  where lower(g.full_name) = lower(trim(coalesce(p_name, '')))
  limit 1;

  if not found then
    return null;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.invitation_sessions (token, guest_id, expires_at)
  values (v_token, v_guest.id, now() + interval '30 days');

  return jsonb_build_object(
    'guestId', v_guest.id,
    'fullName', v_guest.full_name,
    'sessionToken', v_token,
    'confirmed', exists (
      select 1 from public.rsvps r
      where r.guest_id = v_guest.id and r.status = 'confirmed'
    ),
    'attendance', (
      select case r.status when 'confirmed' then 'in' when 'declined' then 'out' else null end
      from public.rsvps r
      where r.guest_id = v_guest.id
    )
  );
end;
$$;

create or replace function public.open_invitation_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_session text;
  v_hash text;
begin
  if length(trim(coalesce(p_token, ''))) < 16 then
    return null;
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select * into v_guest
  from public.guests g
  where g.invitation_token_hash = v_hash
  limit 1;

  if not found then
    return null;
  end if;

  v_session := encode(gen_random_bytes(32), 'hex');
  insert into public.invitation_sessions (token, guest_id, expires_at)
  values (v_session, v_guest.id, now() + interval '30 days');

  return jsonb_build_object(
    'guestId', v_guest.id,
    'fullName', v_guest.full_name,
    'sessionToken', v_session,
    'confirmed', exists (
      select 1 from public.rsvps r
      where r.guest_id = v_guest.id and r.status = 'confirmed'
    ),
    'attendance', (
      select case r.status when 'confirmed' then 'in' when 'declined' then 'out' else null end
      from public.rsvps r
      where r.guest_id = v_guest.id
    )
  );
end;
$$;

create or replace function public.get_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
begin
  select g.* into v_guest
  from public.invitation_sessions s
  join public.guests g on g.id = s.guest_id
  where s.token = p_token
    and s.expires_at > now()
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'guestId', v_guest.id,
    'fullName', v_guest.full_name,
    'sessionToken', p_token,
    'confirmed', exists (
      select 1 from public.rsvps r
      where r.guest_id = v_guest.id and r.status = 'confirmed'
    ),
    'attendance', (
      select case r.status when 'confirmed' then 'in' when 'declined' then 'out' else null end
      from public.rsvps r
      where r.guest_id = v_guest.id
    )
  );
end;
$$;

create or replace function public.confirm_rsvp(p_token text, p_status text default 'confirmed')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_status text;
  v_existing text;
begin
  if p_status = 'declined' then
    v_status := 'declined';
  else
    v_status := 'confirmed';
  end if;

  select g.* into v_guest
  from public.invitation_sessions s
  join public.guests g on g.id = s.guest_id
  where s.token = p_token
    and s.expires_at > now()
  limit 1;

  if not found then
    raise exception 'invitation session is not valid';
  end if;

  select r.status into v_existing
  from public.rsvps r
  where r.guest_id = v_guest.id;

  if v_existing is not distinct from v_status then
    return jsonb_build_object(
      'alreadyConfirmed', true,
      'guestId', v_guest.id,
      'fullName', v_guest.full_name,
      'attendance', case v_status when 'declined' then 'out' else 'in' end
    );
  end if;

  insert into public.rsvps (guest_id, status)
  values (v_guest.id, v_status)
  on conflict (guest_id) do update
    set status = excluded.status,
        updated_at = now();

  return jsonb_build_object(
    'alreadyConfirmed', false,
    'guestId', v_guest.id,
    'fullName', v_guest.full_name,
    'attendance', case v_status when 'declined' then 'out' else 'in' end
  );
end;
$$;

revoke all on function public.search_guests(text) from public;
revoke all on function public.open_invitation(text) from public;
revoke all on function public.open_invitation_link(text) from public;
revoke all on function public.get_invitation(text) from public;
revoke all on function public.confirm_rsvp(text, text) from public;

grant execute on function public.search_guests(text) to anon, authenticated;
grant execute on function public.open_invitation(text) to anon, authenticated;
grant execute on function public.open_invitation_link(text) to anon, authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;
grant execute on function public.confirm_rsvp(text, text) to anon, authenticated;

create or replace function public.list_confirmed_guests()
returns table (id text, full_name text)
language sql
security definer
set search_path = public
as $$
  select g.id, g.full_name
  from public.guests g
  join public.rsvps r on r.guest_id = g.id
  where r.status = 'confirmed'
  order by r.created_at;
$$;

revoke all on function public.list_confirmed_guests() from public;
grant execute on function public.list_confirmed_guests() to anon, authenticated;

insert into public.guests (id, full_name) values
  ('G001', 'Jazi'),
  ('G002', 'Karl'),
  ('G003', 'Anj'),
  ('G004', 'Jerico'),
  ('G005', 'Dustin'),
  ('G006', 'Jian'),
  ('G007', 'Johnfiel'),
  ('G008', 'Kevin'),
  ('G009', 'Bibs'),
  ('G010', 'Champ'),
  ('G011', 'Dave'),
  ('G012', 'Sarah'),
  ('G013', 'Bevs'),
  ('G014', 'Bianca'),
  ('G015', 'Don Johnson'),
  ('G016', 'Jemarich'),
  ('G017', 'Harvey'),
  ('G018', 'Gab'),
  ('G019', 'Jarwin'),
  ('G020', 'Kirby'),
  ('G021', 'Medwin'),
  ('G022', 'Lhean'),
  ('G023', 'Eric'),
  ('G024', 'Rosey'),
  ('G025', 'Ronna'),
  ('G026', 'Francis'),
  ('G027', 'Milko'),
  ('G028', 'Michelle'),
  ('G029', 'Deo'),
  ('G030', 'Joric'),
  ('G031', 'Hana'),
  ('G032', 'Bryan'),
  ('G033', 'Kenneth'),
  ('G034', 'Carlo'),
  ('G035', 'Paulo'),
  ('G036', 'Zac'),
  ('G037', 'Yves'),
  ('G038', 'Kayce'),
  ('G039', 'Marcon'),
  ('G040', 'Edwin'),
  ('G041', 'Memen'),
  ('G042', 'Nielsen'),
  ('G043', 'Jonaber'),
  ('G044', 'Averei'),
  ('G045', 'Razle'),
  ('G046', 'Justin'),
  ('G047', 'Janrey'),
  ('G048', 'Nico')
on conflict (id) do update set full_name = excluded.full_name;
