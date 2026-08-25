import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "fardinApp — English → Chinese CLI Translator",
  description:
    "Type any English sentence into a terminal-styled translator and get instant Simplified Chinese with pinyin.",
  applicationName: "fardinApp",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "fardinApp",
  },
  icons: {
    icon: "/icon-512.svg",
    apple: "/icon-512.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
