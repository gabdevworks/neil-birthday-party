-- Apply after the initial invitation migration.
-- Clears every RSVP, renames Nicso to Nico, and lets the public admin page add guests.

update public.guests
set full_name = 'Nico'
where id = 'G048';

delete from public.rsvps;

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

create or replace function public.list_guests()
returns table (id text, full_name text)
language sql
security definer
set search_path = public
as $$
  select g.id, g.full_name
  from public.guests g
  order by g.id;
$$;

create or replace function public.add_guest(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_id text;
  v_next integer;
begin
  if length(v_name) < 1 or length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'message', 'Enter a name.');
  end if;

  if exists (select 1 from public.guests g where lower(g.full_name) = lower(v_name)) then
    return jsonb_build_object('ok', false, 'message', 'That name is already on the list.');
  end if;

  select coalesce(max(substring(id from 2)::integer), 0) + 1
  into v_next
  from public.guests
  where id ~ '^G[0-9]+$';

  v_id := 'G' || lpad(v_next::text, 3, '0');
  insert into public.guests (id, full_name) values (v_id, v_name);
  return jsonb_build_object('ok', true, 'id', v_id, 'fullName', v_name);
end;
$$;

revoke all on function public.list_guests() from public;
revoke all on function public.add_guest(text) from public;
grant execute on function public.list_guests() to anon, authenticated;
grant execute on function public.add_guest(text) to anon, authenticated;
