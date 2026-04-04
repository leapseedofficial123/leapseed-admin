import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeapSeed給与計算",
    short_name: "LeapSeed給与",
    description: "LeapSeedの成約入力、給与明細、月次分析をまとめて管理するアプリです。",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#24384b",
    icons: [
      {
        src: "/branding/leapseed-home-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/branding/leapseed-home-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/branding/leapseed-home-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
