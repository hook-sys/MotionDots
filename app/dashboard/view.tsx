"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { Desk, Mark, remember, useWindows } from "@/components/site/windows";
import { RENDER_CREDITS } from "@/lib/render/cost";
import { STATUS_UI, ago, projectTitle, type ProjectStatus } from "@/lib/project-ui";
import "@/components/site/site.css";

// The customer dashboard, in the site's glass: the videos and the account,
// one window at a time, and a dock (data comes from page.tsx).

type DashWindow = "videos" | "account";
const PATH: Record<DashWindow, string> = { videos: "/dashboard", account: "/dashboard#account" };
const TITLE: Record<DashWindow, string> = { videos: "Videos", account: "Account" };
const windowAt = (l: Location): DashWindow => (l.hash === "#account" ? "account" : "videos");

type Row = { id: string; script: string | null; status: string; aspect_ratio: string; created_at: string };

export function DashboardView({ email, initial, admin, credits, projects }: { email: string; initial: string; admin: boolean; credits: number; projects: Row[] }) {
  const { current, open, win, iconRef } = useWindows<DashWindow>("videos", PATH, windowAt, TITLE);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const ready = projects.filter((p) => p.status === "done").length;
  const active = projects.filter((p) => p.status === "rendering").length;
  const thisMonth = projects.filter((p) => p.created_at >= monthStart).length;

  return (
    <div className="gs">
      <Desk />

      <header className="gs-bar gs-glass">
        <Link href="/dashboard" className="gs-brand" onClick={open("videos")}>
          <Mark />
          MotionDots
        </Link>
        <Link href="/projects/new" onClick={remember} className="gs-btn">
          New video
        </Link>
      </header>

      <main className="gs-stage">
        {win(
          "videos",
          <>
            <div className="gs-head">
              <div>
                <p className="gs-kicker">Welcome back</p>
                <h2>Your videos</h2>
              </div>
              <Link href="/projects/new" onClick={remember} className="gs-btn big">
                Create a video
              </Link>
            </div>

            <div className="gs-facts four">
              {[
                { label: "Videos", value: projects.length, hint: `${thisMonth} this month` },
                { label: "Ready", value: ready, hint: "To watch and download" },
                { label: "In progress", value: active, hint: active ? "Open it to follow it" : "Nothing running" },
                { label: "Credits", value: credits.toLocaleString("en-US"), hint: `A render costs ${RENDER_CREDITS}` },
              ].map((s) => (
                <div key={s.label}>
                  <small>{s.label}</small>
                  <strong>{s.value}</strong>
                  <span>{s.hint}</span>
                </div>
              ))}
            </div>

            <div className="gs-section">
              <h3>{projects.length ? `All videos · ${projects.length}` : "All videos"}</h3>
              {projects.length === 0 ? (
                <div className="gs-empty">
                  <b>No videos yet</b>
                  <p>Your first video is one voiceover away.</p>
                  <Link href="/projects/new" onClick={remember} className="gs-btn">
                    Create your first video
                  </Link>
                </div>
              ) : (
                <div className="gs-videos">
                  {projects.map((p) => {
                    const ui = STATUS_UI[p.status as ProjectStatus];
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="gs-card" onClick={remember}>
                        <div className="gs-thumb" style={{ background: "#1d1d1f" }}>
                          <Mark />
                        </div>
                        <div className="gs-card-body">
                          <div>
                            <b>{projectTitle(p)}</b>
                            <span suppressHydrationWarning>
                              {ago(p.created_at)} · {p.aspect_ratio}
                            </span>
                          </div>
                          <span className={`gs-pill ${ui.tone}`}>{ui.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>,
        )}

        {win(
          "account",
          <>
            <p className="gs-kicker">Signed in</p>
            <h2>Your account</h2>
            <div className="gs-account">
              <div>
                <span>Email</span>
                <b>{email}</b>
              </div>
              <div>
                <span>Credits</span>
                <b>{credits.toLocaleString("en-US")}</b>
              </div>
              <div>
                <span>Videos made</span>
                <b>{ready}</b>
              </div>
            </div>
            <div className="gs-row" style={{ marginTop: 24 }}>
              <Link href="/billing" onClick={remember} className="gs-btn">
                Buy credits
              </Link>
              {admin && (
                <Link href="/admin" onClick={remember} className="gs-btn ghost">
                  Admin panel
                </Link>
              )}
              <LogoutButton />
            </div>
          </>,
        )}
      </main>

      <footer className="gs-footer">© MotionDots</footer>

      <nav className="gs-dock gs-glass" aria-label="Main">
        <Link href="/" className="gs-dock-brand gs-only-wide" onClick={remember} aria-label="MotionDots home">
          <Mark />
        </Link>
        <Link href={PATH.videos} onClick={open("videos")} aria-current={current === "videos" ? "page" : undefined}>
          <span ref={iconRef("videos")} className="gs-tile t1">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="5" width="7" height="6" rx="1.5" />
              <rect x="13" y="5" width="7" height="6" rx="1.5" />
              <rect x="4" y="13" width="7" height="6" rx="1.5" />
              <rect x="13" y="13" width="7" height="6" rx="1.5" />
            </svg>
          </span>
          <small>Videos</small>
        </Link>
        <Link href={PATH.account} onClick={open("account")} aria-current={current === "account" ? "page" : undefined}>
          <span ref={iconRef("account")} className="gs-tile t5">
            <span className="initial">{initial}</span>
          </span>
          <small>Account</small>
        </Link>
        <Link href="/billing" onClick={remember}>
          <span className="gs-tile t6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M14.5 9.5c-.5-.9-1.5-1.3-2.5-1.3-1.5 0-2.6.8-2.6 1.9 0 2.6 5.3 1.3 5.3 4 0 1.1-1.2 1.9-2.7 1.9-1.1 0-2.1-.4-2.6-1.3M12 6.8v1.4M12 15.8v1.4" />
            </svg>
          </span>
          <small>Credits</small>
        </Link>
        {admin && (
          <Link href="/admin" onClick={remember}>
            <span className="gs-tile t3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 7h14M5 12h14M5 17h14" />
                <circle cx="9" cy="7" r="1.6" fill="#fff" />
                <circle cx="15" cy="12" r="1.6" fill="#fff" />
                <circle cx="8" cy="17" r="1.6" fill="#fff" />
              </svg>
            </span>
            <small>Admin</small>
          </Link>
        )}
        <span className="gs-sep" aria-hidden="true" />
        <Link href="/projects/new" onClick={remember}>
          <span className="gs-tile t4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0a66d6" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
          <small>New video</small>
        </Link>
      </nav>
    </div>
  );
}
