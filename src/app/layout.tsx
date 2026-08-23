import type { Metadata } from "next";
import { Archivo, Allerta_Stencil } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const allertaStencil = Allerta_Stencil({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stencil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crumbs — paste a tweet, get the breakdown",
  description:
    "Crumbs takes a tweet you don't fully understand and breaks it down: what it means, and how to actually implement it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${allertaStencil.variable}`}>
      <body>
        {/*
          THESIS: Crumbs treats confusion-to-clarity as literal stage light, not
          a chat-box card; the surface refuses the generic AI-assistant default.
          OWN-WORLD: Night cyclorama ground (#0B0D1A) rising through cobalt
          (#2F4B8F) and rose (#D98A93) to a warm day wash (#FDFBF7); Allerta
          Stencil for state-cue labels, Archivo for wordmark and body; one
          ember accent (#F0A63B) marks every control.
          STORY: A visitor pastes an opaque tweet, watches the stage light
          rise as Crumbs reads it, and receives the breakdown as three
          horizon-band cards: Core Idea, Terms Explained, How to Implement.
          FIRST VIEWPORT: Centered column on the night ground: state-cue
          eyebrow, "Crumbs" wordmark, tagline, and the paste textarea with
          its ember-accented submit control, nothing else on the dark stage.
          FORM: Dawn Cyclorama, challenger 6 of 6, seed key ce5820c1.
          FINISH: unreviewed and undocumented is unfinished; this build ends
          with the finish review, the verdict, and DESIGN.md.
        */}
        {children}
      </body>
    </html>
  );
}
