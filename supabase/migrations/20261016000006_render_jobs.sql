-- Renders run as background jobs. Starting one (project claimed + credits charged + job created)
-- and failing one (job closed + project marked + credits refunded) are each ONE transaction,
-- so credits are never lost or refunded twice. Only the service role can call these.
alter table public.credit_ledger drop constraint credit_ledger_kind_check;
alter table public.credit_ledger add constraint credit_ledger_kind_check
  check (kind in ('purchase', 'coupon', 'voice', 'render', 'refund'));

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  credits integer not null check (credits >= 0),
  status text not null default 'starting' check (status in ('starting', 'rendering', 'done', 'failed')),
  sandbox_id text,
  cmd_id text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index render_jobs_user_idx on public.render_jobs (user_id, created_at desc);

alter table public.render_jobs enable row level security;
create policy "read own render jobs" on public.render_jobs for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.render_jobs from anon, authenticated;
grant select on public.render_jobs to authenticated;

create function public.start_render_job(p_user uuid, p_project uuid, p_credits integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_project uuid; v_job uuid;
begin
  update public.projects set status = 'rendering', error = null
    where id = p_project and user_id = p_user and status <> 'rendering'
    returning id into v_project;
  if v_project is null then raise exception 'project_unavailable' using errcode = 'P0001'; end if;
  perform public.credit_change(p_user, -p_credits, 'render', 'Video render');
  insert into public.render_jobs (user_id, project_id, credits) values (p_user, p_project, p_credits)
    returning id into v_job;
  return v_job;
end;
$$;

-- The finished video recorded. false = the job was already closed.
create function public.finish_render_job(p_job uuid, p_video_path text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare j public.render_jobs;
begin
  update public.render_jobs set status = 'done', finished_at = now()
    where id = p_job and status in ('starting', 'rendering') returning * into j;
  if j.id is null then return false; end if;
  update public.projects set status = 'done', video_path = p_video_path where id = j.project_id;
  return true;
end;
$$;

-- A failed job closed and its credits returned. false = the job was already closed.
create function public.fail_render_job(p_job uuid, p_error text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare j public.render_jobs;
begin
  update public.render_jobs set status = 'failed', error = p_error, finished_at = now()
    where id = p_job and status in ('starting', 'rendering') returning * into j;
  if j.id is null then return false; end if;
  update public.projects set status = 'failed', error = p_error where id = j.project_id;
  perform public.credit_change(j.user_id, j.credits, 'refund', 'Render failed');
  return true;
end;
$$;

revoke execute on function public.start_render_job(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.finish_render_job(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_render_job(uuid, text) from public, anon, authenticated;
