import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const neueMontreal = localFont({
  variable: "--font-neue-montreal",
  src: [
    { path: "./fonts/neue-montreal/neuemontreal-light.otf", weight: "300", style: "normal" },
    { path: "./fonts/neue-montreal/neuemontreal-lightitalic.otf", weight: "300", style: "italic" },
    { path: "./fonts/neue-montreal/neuemontreal-regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/neue-montreal/neuemontreal-italic.otf", weight: "400", style: "italic" },
    { path: "./fonts/neue-montreal/neuemontreal-medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/neue-montreal/neuemontreal-mediumitalic.otf", weight: "500", style: "italic" },
    { path: "./fonts/neue-montreal/neuemontreal-bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/neue-montreal/neuemontreal-bolditalic.otf", weight: "700", style: "italic" },
  ],
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
    <html lang="en" className={`${neueMontreal.variable} h-dvh antialiased`}>
      <body className="min-h-dvh flex flex-col overscroll-y-none">{children}</body>
    </html>
  );
}
