import type { MetadataRoute } from "next";
import { APP_BASE_PATH, withBasePath } from "@/lib/base-path";
import { APP_TITLE } from "@/lib/constants";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_TITLE,
    short_name: "LeapSeed給与",
    description: "LeapSeedの共有ログイン対応給与計算アプリです。",
    start_url: APP_BASE_PATH || "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#24384b",
    icons: [
      {
        src: withBasePath("/branding/leapseed-home-icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: withBasePath("/branding/leapseed-home-icon-512.png"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
