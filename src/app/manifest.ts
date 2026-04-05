import type { MetadataRoute } from "next";
import { APP_BASE_PATH, withBasePath } from "@/lib/base-path";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeapSeed給与計算",
    short_name: "LeapSeed給与",
    description: "LeapSeedの成約入力、給与明細、月次分析をまとめて管理するアプリです。",
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
