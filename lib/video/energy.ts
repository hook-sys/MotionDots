// A video's energy (drawn per video): its springs, its pace, how much its camera moves, how long the
// ways between scenes take and how many of them are continuous (morph, zoom-through).
export const ENERGIES = ["calm", "medium", "lively"] as const;
export type Energy = (typeof ENERGIES)[number];

export const CAMERAS = ["drift", "push", "pull", "tilt", "float", "orbit", "rise", "macro"] as const;
export type CameraKind = (typeof CAMERAS)[number];

export type EnergySpec = {
  pace: number;
  // how much the camera moves (0–1)
  level: number;
  // frames a way between scenes takes
  hop: number;
  // the least share of scene changes made by a continuous way (morph, zoom-through)
  share: number;
  // frames between things that come in together (50–100 ms at 30 fps)
  stagger: number;
  spring: { damping: number; stiffness: number; mass: number };
  cameras: CameraKind[];
};
export const ENERGY: Record<Energy, EnergySpec> = {
  // (damping ratios ≈ 0.9, 0.7, 0.55: a settle, never an excessive bounce)
  calm: { pace: 0.85, level: 0.25, hop: 30, share: 0.3, stagger: 3, spring: { damping: 20, stiffness: 120, mass: 1 }, cameras: ["drift", "push", "pull", "rise", "float"] },
  medium: { pace: 1, level: 0.5, hop: 24, share: 0.4, stagger: 3, spring: { damping: 17, stiffness: 170, mass: 0.85 }, cameras: ["drift", "push", "pull", "rise", "orbit", "float"] },
  lively: { pace: 1.15, level: 0.75, hop: 18, share: 0.5, stagger: 2, spring: { damping: 14, stiffness: 210, mass: 0.8 }, cameras: ["push", "drift", "orbit", "tilt", "rise", "pull", "macro"] },
};
