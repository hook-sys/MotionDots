-- Private buckets; files are reached only through short-lived signed URLs made on the server.
insert into storage.buckets (id, name, public) values
  ('voice', 'voice', false),
  ('logos', 'logos', false),
  ('renders', 'renders', false)
on conflict (id) do nothing;
