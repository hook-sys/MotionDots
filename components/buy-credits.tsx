"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Pack = { id: string; credits: number; cents: number };

const input =
  "w-full rounded-xl border border-foreground/12 bg-white/80 px-3.5 py-2.5 text-sm uppercase placeholder:text-foreground/35 focus:border-[#0a66d6] focus:outline-none focus:ring-4 focus:ring-[#0a66d6]/15";

// Packs to buy (with a coupon code) and a code to redeem for credits.
// Both talk to /api/billing/*; buying is off until Stripe is set up.
export function BuyCredits({ packs, billingEnabled }: { packs: readonly Pack[]; billingEnabled: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [error, setError] = useState("");

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json() };
  }

  async function buy(packId: string) {
    setError("");
    const { ok, data } = await post("/api/billing/checkout", { packId, code: code || undefined });
    if (ok) window.location.assign(data.url);
    else setError(data.error);
  }

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { ok, data } = await post("/api/billing/redeem", { code: redeemCode });
    if (ok) router.push("/billing?ok=" + data.credits);
    else setError(data.error);
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Buy credits</h2>
        {!billingEnabled && <p className="rounded-xl border border-foreground/10 bg-white/70 px-4 py-3 text-sm text-foreground/70">Buying credits is coming soon.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {packs.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!billingEnabled}
              onClick={() => buy(p.id)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-foreground/10 bg-white/80 p-5 text-left transition enabled:hover:border-[#0a66d6] enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-2xl font-semibold">${(p.cents / 100).toFixed(2)}</span>
              <span className="text-sm text-foreground/70">{p.credits.toLocaleString("en-US")} credits</span>
              <span className="mt-2 text-sm font-medium text-[#0a66d6]">Buy →</span>
            </button>
          ))}
        </div>
        <label className="flex max-w-sm flex-col gap-1.5 text-sm">
          <span className="text-foreground/60">Have a coupon? Enter it, then pick a pack.</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" autoCapitalize="characters" className={input} />
        </label>
        <p className="text-xs text-foreground/45">Secure payment by Stripe.</p>
      </div>

      <form onSubmit={redeem} className="flex max-w-sm flex-col gap-2">
        <h2 className="text-lg font-semibold">Redeem a code</h2>
        <div className="flex gap-2">
          <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} required placeholder="CODE" className={input} />
          <button className="gs-btn">Redeem</button>
        </div>
      </form>
    </div>
  );
}
