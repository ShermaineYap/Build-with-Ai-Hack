import type { Metadata, Viewport } from "next";
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/400-italic.css";
import "@fontsource/schibsted-grotesk/700.css";
import "@fontsource/schibsted-grotesk/900.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baca Dulu — read your offer letter before you sign",
  description:
    "Paste your first Malaysian job offer letter and see your real take-home pay, the clauses that bite, and what to ask HR before you sign.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d9ded6" },
    { media: "(prefers-color-scheme: dark)", color: "#151a18" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-MY">
      <body>{children}</body>
    </html>
  );
}
