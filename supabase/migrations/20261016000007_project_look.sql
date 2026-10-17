-- The look each video was made with (recipe, palette, fonts, energy), so the next video can avoid the last five.
alter table public.projects add column look jsonb;
