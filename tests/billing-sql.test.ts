import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

// Runs the real migrations on an in-memory Postgres (auth/roles stubbed) to prove the
// payment, coupon and credit functions are atomic and idempotent.
const migration = (name: string) => readFileSync(path.join(import.meta.dirname, "../supabase/migrations", name), "utf8");

let db: PGlite;
const U1 = "00000000-0000-0000-0000-000000000001";
const U2 = "00000000-0000-0000-0000-000000000002";

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  `);
  for (const f of ["20261016000001_profiles.sql", "20261016000002_billing.sql", "20261016000003_projects_voice.sql", "20261016000005_voice_words.sql", "20261016000006_render_jobs.sql"]) await db.exec(migration(f));
  await db.exec(`insert into auth.users (id, email) values ('${U1}', 'a@x.com'), ('${U2}', 'b@x.com')`);
});

const credits = async (u: string) => (await db.query<{ credits: number }>(`select credits from public.profiles where id = '${u}'`)).rows[0].credits;
const fail = async (sql: string) => db.exec(sql).then(() => "", (e: Error) => e.message);

describe("credit_change", () => {
  it("never lets a balance go below zero and logs changes", async () => {
    await db.exec(`select public.credit_change('${U1}', 10, 'purchase')`);
    expect(await fail(`select public.credit_change('${U1}', -11, 'voice')`)).toContain("insufficient_credits");
    await db.exec(`select public.credit_change('${U1}', -4, 'voice')`);
    expect(await credits(U1)).toBe(6);
    const ledger = await db.query(`select delta, balance_after from public.credit_ledger order by created_at`);
    expect(ledger.rows).toEqual([{ delta: 10, balance_after: 10 }, { delta: -4, balance_after: 6 }]);
  });
});

describe("checkout", () => {
  beforeEach(async () => {
    await db.exec(`insert into public.coupons (code, kind, value, max_uses) values ('HALF', 'discount', 50, 1), ('FREE', 'credits', 25, null)`);
  });

  it("applies a discount and reserves exactly one use", async () => {
    const r = await db.query<{ net_cents: number }>(`select * from public.start_checkout('${U1}', 100, 1000, 'half')`);
    expect(r.rows[0].net_cents).toBe(500);
    // max_uses = 1: a second buyer is refused
    expect(await fail(`select * from public.start_checkout('${U2}', 100, 1000, 'HALF')`)).toContain("invalid_coupon");
    expect((await db.query(`select count(*)::int as n from public.payments`)).rows[0]).toEqual({ n: 1 });
  });

  it("gives the coupon use back when the payment fails", async () => {
    const r = await db.query<{ payment_id: string }>(`select * from public.start_checkout('${U1}', 100, 1000, 'HALF')`);
    await db.exec(`select public.fail_payment('${r.rows[0].payment_id}')`);
    const c = await db.query(`select uses from public.coupons where code = 'HALF'`);
    expect(c.rows[0]).toEqual({ uses: 0 });
    await db.exec(`select * from public.start_checkout('${U2}', 100, 1000, 'HALF')`); // usable again
  });

  it("credits a paid purchase exactly once and checks the amount", async () => {
    const r = await db.query<{ payment_id: string }>(`select * from public.start_checkout('${U1}', 100, 1000, null)`);
    const id = r.rows[0].payment_id;
    expect(await fail(`select public.fulfill_payment('${id}', 999, 'cs_1')`)).toContain("amount_mismatch");
    expect(await credits(U1)).toBe(0);
    await db.exec(`select public.fulfill_payment('${id}', 1000, 'cs_1')`);
    await db.exec(`select public.fulfill_payment('${id}', 1000, 'cs_1')`); // webhook retry
    expect(await credits(U1)).toBe(100);
  });
});

describe("redeem_credit_coupon", () => {
  it("gives credits once per user", async () => {
    await db.exec(`insert into public.coupons (code, kind, value) values ('FREE', 'credits', 25)`);
    await db.exec(`select public.redeem_credit_coupon('${U1}', 'free')`);
    expect(await credits(U1)).toBe(25);
    expect(await fail(`select public.redeem_credit_coupon('${U1}', 'FREE')`)).toContain("invalid_coupon");
    expect(await credits(U1)).toBe(25);
  });

  it("does not accept a discount code as a credit code", async () => {
    await db.exec(`insert into public.coupons (code, kind, value) values ('HALF', 'discount', 50)`);
    expect(await fail(`select public.redeem_credit_coupon('${U1}', 'HALF')`)).toContain("invalid_coupon");
  });
});

describe("render jobs", () => {
  const P = "00000000-0000-0000-0000-0000000000a1";
  beforeEach(async () => {
    await db.exec(`insert into public.voiceovers (id, user_id, source, path, words) values ('${P}', '${U1}', 'uploaded', 'p', '[]')`);
    await db.exec(`insert into public.projects (id, user_id, voiceover_id, logo_path, aspect_ratio) values ('${P}', '${U1}', '${P}', 'l', '16:9')`);
    await db.exec(`select public.credit_change('${U1}', 25, 'purchase')`);
  });
  const start = async () => (await db.query<{ start_render_job: string }>(`select public.start_render_job('${U1}', '${P}', 10)`)).rows[0].start_render_job;

  it("charges on start and refuses a second start while rendering", async () => {
    await start();
    expect(await credits(U1)).toBe(15);
    expect(await fail(`select public.start_render_job('${U1}', '${P}', 10)`)).toContain("project_unavailable");
    expect(await credits(U1)).toBe(15);
  });

  it("refuses to start, charging nothing, without enough credits or for someone else's project", async () => {
    expect(await fail(`select public.start_render_job('${U1}', '${P}', 26)`)).toContain("insufficient_credits");
    expect(await credits(U1)).toBe(25);
    expect(await fail(`select public.start_render_job('${U2}', '${P}', 10)`)).toContain("project_unavailable");
  });

  it("refunds a failed job exactly once", async () => {
    const job = await start();
    await db.exec(`select public.fail_render_job('${job}', 'boom')`);
    await db.exec(`select public.fail_render_job('${job}', 'boom again')`);
    expect(await credits(U1)).toBe(25);
    expect((await db.query(`select status from public.projects where id = '${P}'`)).rows[0]).toEqual({ status: "failed" });
    await start(); // can be retried
  });

  it("does not refund a job that finished", async () => {
    const job = await start();
    await db.exec(`select public.finish_render_job('${job}', 'v.mp4')`);
    await db.exec(`select public.fail_render_job('${job}', 'late')`);
    expect(await credits(U1)).toBe(15);
    expect((await db.query(`select status, video_path from public.projects where id = '${P}'`)).rows[0]).toEqual({ status: "done", video_path: "v.mp4" });
  });
});
