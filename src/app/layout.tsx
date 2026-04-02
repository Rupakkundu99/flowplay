import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowPlay - Shared YouTube Playlists",
  description: "Create and share Youtube video queues instantly without registration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans min-h-screen flex flex-col bg-black text-gray-50 antialiased selection:bg-emerald-500/30`}
      >
        <Navbar />
        <main className="flex-1 flex flex-col relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black -z-10" />
          {children}
        </main>
      </body>
    </html>
  );
}
