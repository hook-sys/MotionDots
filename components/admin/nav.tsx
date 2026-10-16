"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Icon paths (24×24, stroke) for the sidebar.
const I = {
  models: "M12 2l8 4.5v9L12 20l-8-4.5v-9zM12 11l8-4.5M12 11v9M12 11L4 6.5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  videos: "M15 10l5-3v10l-5-3M3 6h12v12H3z",
  billing: "M2 5h20v14H2zM2 10h20",
  coupons: "M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 0 4v0a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4zM9 6v12",
};

// href null = not built yet (shown as "Soon", not a link).
const GROUPS: { title: string; items: { href: string | null; label: string; icon: keyof typeof I }[] }[] = [
  { title: "System", items: [{ href: "/admin/models", label: "AI models", icon: "models" }] },
  {
    title: "Manage",
    items: [
      { href: null, label: "Users", icon: "users" },
      { href: null, label: "Videos", icon: "videos" },
      { href: null, label: "Pricing & payments", icon: "billing" },
      { href: null, label: "Coupons", icon: "coupons" },
    ],
  },
];

function Icon({ d, className = "size-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AdminNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="gs-glass fixed right-6 top-[22px] z-50 rounded-full px-3.5 py-1.5 text-sm text-white lg:hidden" aria-label="Menu">
        {open ? "Close" : "Menu"}
      </button>
      <nav className={`${open ? "flex" : "hidden"} gs-glass fixed bottom-6 left-4 top-[96px] z-40 w-60 flex-col gap-6 overflow-y-auto rounded-[22px] px-3 py-5 lg:flex`}>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{g.title}</p>
            {g.items.map((it) =>
              it.href ? (
                <Link
                  key={it.label}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${path.startsWith(it.href) ? "bg-white/[0.12] text-white" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  <Icon d={I[it.icon]} className={`size-4 ${path.startsWith(it.href) ? "text-[#9cc2ff]" : ""}`} />
                  <span className="flex-1">{it.label}</span>
                </Link>
              ) : (
                <span key={it.label} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600">
                  <Icon d={I[it.icon]} />
                  <span className="flex-1">{it.label}</span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 text-[11px]">Soon</span>
                </span>
              ),
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
