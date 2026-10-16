import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/nav";
import { Badge } from "@/components/admin/ui";
import { LogoutButton } from "@/components/logout-button";
import { Desk, Mark } from "@/components/site/windows";
import { requireSuperAdmin } from "@/lib/auth";
import "@/components/site/site.css";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · MotionDots" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    if (auth.error.status === 401) redirect("/login");
    notFound();
  }
  return (
    <div className="gs gs-dark">
      <Desk />
      <header className="gs-bar gs-glass admin">
        <Link href="/admin" className="gs-brand">
          <Mark />
          MotionDots
        </Link>
        <Badge>Super admin</Badge>
        <div className="ml-auto hidden items-center gap-3 text-sm sm:flex">
          <span className="text-zinc-500">{auth.user.email}</span>
          <Link href="/dashboard" className="gs-plain">
            Open app
          </Link>
          <LogoutButton />
        </div>
      </header>
      <AdminNav />
      <main className="gs-admin-stage">
        <section className="gs-win gs-glass">
          <div className="gs-titlebar">
            <div className="gs-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span>Admin</span>
          </div>
          <div className="flex flex-col gap-6 p-5 sm:p-8">{children}</div>
        </section>
      </main>
    </div>
  );
}
