-- Renames guest G046 from Justin to Justine.

update public.guests
set full_name = 'Justine'
where id = 'G046';
