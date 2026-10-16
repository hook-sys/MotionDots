import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: vi.fn() }) }));

process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
const { POST } = await import("@/app/api/stripe/webhook/route");

describe("stripe webhook", () => {
  it("rejects a request without a signature", async () => {
    const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
  it("rejects a forged signature", async () => {
    const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(res.status).toBe(400);
  });
});
