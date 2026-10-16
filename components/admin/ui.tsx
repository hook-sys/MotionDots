// Building blocks for the admin panel (the site's glass in its dark tone).

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
      {sub && <p className="mt-1 text-sm text-zinc-400">{sub}</p>}
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-200">{title}</h2>
      {children}
    </section>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#0a66d6]/25 px-2 py-0.5 text-[11px] font-medium text-[#9cc2ff]">{children}</span>;
}

export const btnPrimary = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50";
export const input = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#4f8ff0]/70";
