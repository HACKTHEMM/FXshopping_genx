import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FxShopping - Shopping Dashboard",
  description: "Modern shopping dashboard with wallet management and spending insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${valve.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
