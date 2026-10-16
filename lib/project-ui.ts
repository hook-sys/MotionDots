// How a project shows in the UI: its title and its status pill (site.css .gs-pill.*).
export type ProjectStatus = "draft" | "rendering" | "done" | "failed";

export const STATUS_UI: Record<ProjectStatus, { label: string; tone: "ok" | "busy" | "bad" | "plain" }> = {
  draft: { label: "Draft", tone: "plain" },
  rendering: { label: "Rendering", tone: "busy" },
  done: { label: "Ready", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
};

export const projectTitle = (p: { script: string | null }) => (p.script ? (p.script.length > 48 ? `${p.script.slice(0, 48).trim()}…` : p.script) : "Video with your own voice");

export function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
