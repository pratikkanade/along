import type { Metadata, Viewport } from "next";
import { Inter, Quintessential } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const quintessential = Quintessential({
  variable: "--font-quintessential",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Along",
  description: "Real-time, spontaneous meetup matching.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Along",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f97316",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${quintessential.variable} h-dvh antialiased`}
    >
      <body className="min-h-dvh flex flex-col overscroll-y-none">{children}</body>
    </html>
  );
}
