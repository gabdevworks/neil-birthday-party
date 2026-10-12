-- Renames guest G021 from Medwin to Medwyn.

update public.guests
set full_name = 'Medwyn'
where id = 'G021';
