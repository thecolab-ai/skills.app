import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Skills Explorer | thecolab.ai",
    template: "%s | thecolab.ai",
  },
  description:
    "Browse, read, and run thecolab.ai's New Zealand Claude Code skills — a warm, AI-native explorer for NZ data CLIs. AI expertise, built together.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  robots: "noindex, nofollow, noarchive, nosnippet, noimageindex",
};

// Apply the stored theme before first paint to avoid a flash of the wrong theme.
const themeBootstrap =
  "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-serif",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        sans.variable,
        mono.variable,
        serif.variable,
        "bg-background text-foreground",
      )}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted inline theme bootstrap
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body className="flex grow">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
