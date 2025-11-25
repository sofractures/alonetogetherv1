import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BackgroundAudio from "@/components/audio/BackgroundAudio";
import AnimatedGrainOptimized from "@/components/AnimatedGrainOptimized";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alone Together",
  description: "A modern React application built with Next.js, TypeScript, and Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <BackgroundAudio />
        {children}
        <AnimatedGrainOptimized opacity={4} fps={24} blendMode="screen" />
      </body>
    </html>
  );
}
