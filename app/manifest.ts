import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Along — free right now",
    short_name: "Along",
    description: "Real-time, spontaneous meetup matching.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#f97316",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
