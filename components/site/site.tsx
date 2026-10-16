"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Desk, Mark, remember, useWindows } from "./windows";
import "./site.css";

// The site before login: one glass window at a time over a still desk, and a
// dock for the menu; a window opens out of the icon clicked (windows.tsx).
// /, /login and /signup all render this.

export type SiteWindow = "overview" | "how" | "examples" | "login" | "signup";
const PATH: Record<SiteWindow, string> = { overview: "/", how: "/#how", examples: "/#examples", login: "/login", signup: "/signup" };
const TITLE: Record<SiteWindow, string> = { overview: "Overview", how: "How it works", examples: "Examples", login: "Log in", signup: "Start free" };
const windowAt = (l: Location): SiteWindow => (l.pathname.startsWith("/login") ? "login" : l.pathname.startsWith("/signup") ? "signup" : l.hash === "#how" ? "how" : l.hash === "#examples" ? "examples" : "overview");

export function Site({ initial, signedIn }: { initial: SiteWindow; signedIn: boolean }) {
  const { current, open, win, iconRef } = useWindows(initial, PATH, windowAt, TITLE);
  const router = useRouter();
  const [note, setNote] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  async function submit(mode: "login" | "signup", e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNote(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createBrowserSupabase();
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    if (error) return setNote({ tone: "error", text: error.message });
    if (mode === "signup") return setNote({ tone: "info", text: "Check your email to confirm your account." });
    router.push("/dashboard");
    router.refresh();
  }

  const play = (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M5 3v12l10-6z" fill="#1d1d1f" />
    </svg>
  );

  return (
    <div className="gs">
      <Desk />

      <header className="gs-bar gs-glass">
        <Link href="/" className="gs-brand" onClick={open("overview")}>
          <Mark />
          MotionDots
        </Link>
        {signedIn ? (
          <Link href="/dashboard" className="gs-btn" onClick={remember}>
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" ref={iconRef("login")} className="gs-plain" onClick={open("login")}>
              Log in
            </Link>
            <Link href="/signup" className="gs-btn" onClick={open("signup")}>
              Start free
            </Link>
          </>
        )}
      </header>

      <main className="gs-stage">
        {win(
          "overview",
          <>
            <div className="gs-ov">
              <div>
                <h1>
                  Your voice,
                  <br />
                  turned into a video.
                </h1>
                <p className="gs-lead">Write a script or upload your own recording, add your logo, and pick a shape. MotionDots makes the video around your voice.</p>
                <div className="gs-row">
                  {signedIn ? (
                    <Link href="/projects/new" onClick={remember} className="gs-btn big">
                      Create video
                    </Link>
                  ) : (
                    <Link href="/signup" className="gs-btn big" onClick={open("signup")}>
                      Start free
                    </Link>
                  )}
                  <Link href="/#how" className="gs-btn ghost big" onClick={open("how")}>
                    How it works
                  </Link>
                </div>
              </div>
              <div className="gs-screen">
                <div className="gs-frame">
                  <div className="card">
                    <b>Your script</b>
                    <i className="on" />
                    <i />
                    <i />
                  </div>
                  <button type="button" className="gs-play" aria-label="How it works" onClick={open("how")}>
                    {play}
                  </button>
                  <div className="num">
                    Your voice<small>word by word</small>
                  </div>
                </div>
                <div className="gs-meta">
                  <span>Voiceover + logo</span>
                  <span className="gs-formats">
                    <span>16:9</span>
                    <span>9:16</span>
                    <span>1:1</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="gs-facts">
              <div>
                <b>Your words, read aloud</b>
                <span>Pick a voice artist, or upload your own voice.</span>
              </div>
              <div>
                <b>Made for your brand</b>
                <span>Your logo or icon in the video.</span>
              </div>
              <div>
                <b>Download as MP4</b>
                <span>Wide, tall or square, ready to post.</span>
              </div>
            </div>
          </>,
        )}

        {win(
          "how",
          <>
            <h2>Three steps. No editing.</h2>
            <p className="gs-lead">You bring the voice and the logo. MotionDots does the rest.</p>
            <div className="gs-steps">
              {[
                ["Add your voice", "Write the script and pick a voice artist, or upload your own recording.", "script or voice"],
                ["Add your logo", "Upload your logo or icon and choose wide, tall or square.", "logo + shape"],
                ["Render and download", "Your video is rendered in the background. Download it as an MP4.", "MP4"],
              ].map(([title, text, tag], i) => (
                <div key={title} className="gs-step">
                  <span className="n">{i + 1}</span>
                  <div>
                    <b>{title}</b>
                    <span>{text}</span>
                  </div>
                  <em>{tag}</em>
                </div>
              ))}
            </div>
          </>,
        )}

        {win(
          "examples",
          <>
            <h2>Examples are coming soon.</h2>
            <p className="gs-lead">Videos made with MotionDots will appear here.</p>
          </>,
        )}

        {win(
          "login",
          <form onSubmit={(e) => submit("login", e)} className="gs-auth">
            <h2>Welcome back</h2>
            <p>Log in to see your videos.</p>
            {current === "login" && note && <p className={`gs-note ${note.tone}`}>{note.text}</p>}
            <label htmlFor="gs-login-email">Email</label>
            <input id="gs-login-email" name="email" type="email" required autoComplete="email" />
            <label htmlFor="gs-login-password">Password</label>
            <input id="gs-login-password" name="password" type="password" required minLength={8} autoComplete="current-password" />
            <button className="gs-btn">Log in</button>
            <div className="gs-switch">
              New here?{" "}
              <button type="button" onClick={open("signup")}>
                Start free
              </button>
            </div>
          </form>,
        )}

        {win(
          "signup",
          <form onSubmit={(e) => submit("signup", e)} className="gs-auth">
            <h2>Make your first video</h2>
            <p>Just an email and a password.</p>
            {current === "signup" && note && <p className={`gs-note ${note.tone}`}>{note.text}</p>}
            <label htmlFor="gs-signup-email">Email</label>
            <input id="gs-signup-email" name="email" type="email" required autoComplete="email" />
            <label htmlFor="gs-signup-password">Password</label>
            <input id="gs-signup-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            <button className="gs-btn">Create account</button>
            <div className="gs-switch">
              Have an account?{" "}
              <button type="button" onClick={open("login")}>
                Log in
              </button>
            </div>
          </form>,
        )}
      </main>

      <footer className="gs-footer">© MotionDots</footer>

      <nav className="gs-dock gs-glass" aria-label="Main">
        {(
          [
            // (the black one carries the mark: the brand is not repeated above it)
            ["overview", "t1", null],
            ["how", "t2", <path key="p" d="M6 7h12M6 12h8M6 17h10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />],
            [
              "examples",
              "t3",
              <g key="p" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="4" y="5" width="7" height="6" rx="1.5" />
                <rect x="13" y="5" width="7" height="6" rx="1.5" />
                <rect x="4" y="13" width="7" height="6" rx="1.5" />
                <rect x="13" y="13" width="7" height="6" rx="1.5" />
              </g>,
            ],
          ] as const
        ).map(([id, tone, glyph]) => (
          <Link key={id} href={PATH[id]} onClick={open(id)} aria-current={current === id ? "page" : undefined}>
            <span ref={iconRef(id)} className={`gs-tile ${tone}`}>
              {glyph ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {glyph}
                </svg>
              ) : (
                <Mark />
              )}
            </span>
            <small>{TITLE[id]}</small>
          </Link>
        ))}
        <span className="gs-sep" aria-hidden="true" />
        {signedIn ? (
          <Link href="/dashboard" onClick={remember}>
            <span className="gs-tile t4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a66d6" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 6v12M6 12h12" />
              </svg>
            </span>
            <small>Dashboard</small>
          </Link>
        ) : (
          <>
            <Link href="/login" onClick={open("login")} className="gs-only-wide" aria-current={current === "login" ? "page" : undefined}>
              <span ref={iconRef("login")} className="gs-tile t2">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
                </svg>
              </span>
              <small>Log in</small>
            </Link>
            <Link href="/signup" onClick={open("signup")} aria-current={current === "signup" ? "page" : undefined}>
              <span ref={iconRef("signup")} className="gs-tile t4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#0a66d6" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </span>
              <small>Start free</small>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
