import type { Metadata } from "next";
import { AppShell } from "@/components/site/app-shell";
import { BuyCredits } from "@/components/buy-credits";
import { PACKS } from "@/lib/billing/packs";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { billingEnabled } from "@/lib/stripe";
import { getSiteUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Credits" };

const KIND: Record<string, string> = { purchase: "Purchase", coupon: "Code", voice: "Voice", render: "Render", refund: "Refund" };

// The customer's credits: the balance, packs to buy (with a code), a code to redeem, and what was spent on what.
export default async function BillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { paid, ok } = await searchParams;
  const { supabase, admin, initial, credits } = await getSiteUser();
  const { data: ledger } = await supabase.from("credit_ledger").select("created_at, delta, kind, note").order("created_at", { ascending: false }).limit(30);

  return (
    <AppShell title="Credits" admin={admin} active="credits" initial={initial}>
      <div className="flex flex-col gap-8">
        <div>
          <p className="text-sm font-medium text-foreground/50">Your balance</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">{credits.toLocaleString("en-US")}</p>
          <p className="mt-2 text-sm text-foreground/55">A render costs {RENDER_CREDITS} credits. A generated voice costs 1 credit per 100 characters.</p>
        </div>

        {paid && <p className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Thank you. Your credits arrive in your balance as soon as the payment is confirmed.</p>}
        {ok && <p className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Code redeemed: {Number(ok).toLocaleString("en-US")} credits added.</p>}

        <BuyCredits packs={PACKS} billingEnabled={billingEnabled()} />

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">History</h2>
          {(ledger ?? []).length === 0 ? (
            <p className="text-sm text-foreground/50">Nothing yet.</p>
          ) : (
            <div className="divide-y divide-foreground/[0.06] overflow-hidden rounded-2xl border border-foreground/10 bg-white/70">
              {(ledger ?? []).map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{KIND[l.kind] ?? l.kind}</p>
                    <p className="truncate text-xs text-foreground/50">{[new Date(l.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), l.note].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className={`tabular-nums font-medium ${l.delta >= 0 ? "text-emerald-600" : "text-foreground/70"}`}>
                    {l.delta >= 0 ? "+" : ""}
                    {l.delta.toLocaleString("en-US")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
