import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "MotionDots", description: "MotionDots: videos from your voiceover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
