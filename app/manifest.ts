import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AI Task Planner",
    short_name: "AI Task Planner",
    description: "学生向けタスクプランナー",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f0e3",
    theme_color: "#3479af",
    icons: [
      {
        src: "/icons/ai-task-planner-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/ai-task-planner-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
