import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const valve = localFont({
  variable: "--font-valve",
  src: [
    { path: "../fonts/PPValve-PlainExtralight.otf", weight: "200", style: "normal" },
    { path: "../fonts/PPValve-PlainExtralightItalic.otf", weight: "200", style: "italic" },
    { path: "../fonts/PPValve-PlainMedium.otf", weight: "500", style: "normal" },
    { path: "../fonts/PPValve-PlainMediumItalic.otf", weight: "500", style: "italic" },
    { path: "../fonts/PPValve-PlainExtrabold.otf", weight: "800", style: "normal" },
    { path: "../fonts/PPValve-PlainExtraboldItalic.otf", weight: "800", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LumenFX - Payments Simplified",
  description: "Modern payments dashboard with wallet management and spending insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${valve.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
