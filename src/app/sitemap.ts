import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Открытые страницы — те же, что разрешены в robots.ts. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/register", 0.6, "monthly"),
    page("/login", 0.3, "yearly"),
    page("/offer", 0.2, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/consent", 0.1, "yearly"),
    page("/cookies", 0.1, "yearly"),
  ];
}
