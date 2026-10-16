-- Credits, coupons and payments. Every money/credit state change is ONE
-- database function (one transaction): a payment, its coupon use and the
-- credits it grants either all happen or none do. Only the service role can
-- call them.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  -- discount: % off a purchase · credits: credits given outright
  kind text not null check (kind in ('discount', 'credits')),
  value integer not null check (value > 0 and (kind = 'credits' or value <= 100)),
  active boolean not null default true,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  per_user_once boolean not null default true,
  uses integer not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_session_id text unique,
  credits integer not null check (credits > 0),
  list_cents integer not null check (list_cents > 0),
  net_cents integer not null check (net_cents >= 0),
  coupon_id uuid references public.coupons (id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  payment_id uuid references public.payments (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_user_idx on public.coupon_redemptions (coupon_id, user_id);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  kind text not null check (kind in ('purchase', 'coupon', 'voice', 'refund')),
  note text,
  created_at timestamptz not null default now()
);
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

alter table public.coupons enable row level security;
alter table public.payments enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.credit_ledger enable row level security;
create policy "read own payments" on public.payments for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own ledger" on public.credit_ledger for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.coupons, public.coupon_redemptions, public.payments, public.credit_ledger from anon, authenticated;
grant select on public.payments, public.credit_ledger to authenticated;

-- The one way a balance changes: logged, and never below zero.
create function public.credit_change(p_user uuid, p_delta integer, p_kind text, p_note text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  update public.profiles set credits = credits + p_delta
    where id = p_user and credits + p_delta >= 0
    returning credits into v_balance;
  if v_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, delta, balance_after, kind, note)
    values (p_user, p_delta, v_balance, p_kind, p_note);
  return v_balance;
end;
$$;

-- Locks and checks a coupon for a user. Raises invalid_coupon when it can't be used.
create function public.lock_coupon(p_user uuid, p_code text, p_kind text)
returns public.coupons language plpgsql security definer set search_path = '' as $$
declare c public.coupons;
begin
  select * into c from public.coupons where code = upper(trim(p_code)) for update;
  if c.id is null or not c.active or c.kind <> p_kind
     or (c.expires_at is not null and c.expires_at < now())
     or (c.max_uses is not null and c.uses >= c.max_uses)
     or (c.per_user_once and exists (select 1 from public.coupon_redemptions r where r.coupon_id = c.id and r.user_id = p_user))
  then
    raise exception 'invalid_coupon' using errcode = 'P0001';
  end if;
  return c;
end;
$$;

-- A purchase begun: the pending payment and (if a code is given) its reserved use.
create function public.start_checkout(p_user uuid, p_credits integer, p_list_cents integer, p_code text default null)
returns table (payment_id uuid, net_cents integer) language plpgsql security definer set search_path = '' as $$
declare c public.coupons; v_net integer := p_list_cents; v_id uuid;
begin
  if p_code is not null and trim(p_code) <> '' then
    c := public.lock_coupon(p_user, p_code, 'discount');
    v_net := p_list_cents - (p_list_cents * c.value) / 100;
  end if;
  insert into public.payments (user_id, credits, list_cents, net_cents, coupon_id)
    values (p_user, p_credits, p_list_cents, v_net, c.id) returning id into v_id;
  if c.id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, payment_id) values (c.id, p_user, v_id);
    update public.coupons set uses = uses + 1 where id = c.id;
  end if;
  return query select v_id, v_net;
end;
$$;

-- A paid purchase credited exactly once. false = it was already paid.
-- Raises amount_mismatch when Stripe's paid amount isn't what was charged.
create function public.fulfill_payment(p_payment uuid, p_paid_cents integer, p_session text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then raise exception 'payment_not_found' using errcode = 'P0001'; end if;
  if p.status = 'paid' then return false; end if;
  if p.status <> 'pending' or p.net_cents <> p_paid_cents
     or (p.stripe_session_id is not null and p_session is not null and p.stripe_session_id <> p_session) then
    raise exception 'amount_mismatch' using errcode = 'P0001';
  end if;
  update public.payments set status = 'paid', paid_at = now(),
    stripe_session_id = coalesce(stripe_session_id, p_session) where id = p.id;
  perform public.credit_change(p.user_id, p.credits, 'purchase', 'Credit pack');
  return true;
end;
$$;

-- An abandoned/expired purchase closed and its coupon use given back.
create function public.fail_payment(p_payment uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment for update;
  if p.id is null or p.status <> 'pending' then return false; end if;
  update public.payments set status = 'failed' where id = p.id;
  if p.coupon_id is not null then
    delete from public.coupon_redemptions where payment_id = p.id;
    update public.coupons set uses = uses - 1 where id = p.coupon_id;
  end if;
  return true;
end;
$$;

-- A code that gives credits outright: use + credits in one step. Returns the credits given.
create function public.redeem_credit_coupon(p_user uuid, p_code text)
returns integer language plpgsql security definer set search_path = '' as $$
declare c public.coupons;
begin
  c := public.lock_coupon(p_user, p_code, 'credits');
  insert into public.coupon_redemptions (coupon_id, user_id) values (c.id, p_user);
  update public.coupons set uses = uses + 1 where id = c.id;
  perform public.credit_change(p_user, c.value, 'coupon', 'Code ' || c.code);
  return c.value;
end;
$$;

revoke execute on function public.credit_change(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.lock_coupon(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.start_checkout(uuid, integer, integer, text) from public, anon, authenticated;
revoke execute on function public.fulfill_payment(uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.fail_payment(uuid) from public, anon, authenticated;
revoke execute on function public.redeem_credit_coupon(uuid, text) from public, anon, authenticated;
