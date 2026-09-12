import type { MetadataRoute } from "next";

const ICON_VERSION = "dark-green-20260912";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "DiaryDock",
    short_name: "DiaryDock",
    description: "Your digital home, for everyday life.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#edf3e9",
    theme_color: "#20352a",
    icons: [
      {
        src: `/icons/icon-192.png?v=${ICON_VERSION}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: `/icons/icon-512.png?v=${ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: `/icons/icon-512.png?v=${ICON_VERSION}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
