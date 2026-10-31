"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import type { PublicSupabaseConfig } from "./public-config";

export function createSupabaseBrowserClient(config: PublicSupabaseConfig) {
  return createBrowserClient<Database>(config.url, config.key, {
    cookieOptions: { path: "/", sameSite: "lax", secure: typeof window !== "undefined" && window.location.protocol === "https:" },
  });
}
