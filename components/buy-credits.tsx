"use client";
import { useState } from "react";

type Pack = { id: string; credits: number; cents: number };

export function BuyCredits({ packs, billingEnabled }: { packs: readonly Pack[]; billingEnabled: boolean }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function post(url: string, body: object) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json() };
  }

  async function buy(packId: string) {
    const { ok, data } = await post("/api/billing/checkout", { packId, code: code || undefined });
    if (ok) window.location.assign(data.url);
    else setMessage(data.error);
  }

  async function redeem() {
    const { ok, data } = await post("/api/billing/redeem", { code });
    if (ok) location.reload();
    else setMessage(data.error);
  }

  return (
    <section>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code (optional)" />
      {packs.map((p) => (
        <button key={p.id} onClick={() => buy(p.id)} disabled={!billingEnabled}>
          {p.credits} credits - ${(p.cents / 100).toFixed(2)}
        </button>
      ))}
      {!billingEnabled && <p>Buying credits is not available yet.</p>}
      <button onClick={redeem} disabled={!code}>Redeem code for credits</button>
      {message && <p className="error">{message}</p>}
    </section>
  );
}
