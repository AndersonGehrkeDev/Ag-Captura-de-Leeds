import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { getAuthConfiguration } from "@/server/auth/configuration";

export async function createSupabaseServerClient(writable = false) {
  const { publicConfig, available, origin } = getAuthConfiguration();
  if (!publicConfig || !available) return null;
  const store = await cookies();
  return createServerClient<Database>(publicConfig.url, publicConfig.key, {
    cookieOptions: { path: "/", sameSite: "lax", secure: origin?.startsWith("https:") },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Server Components são somente leitura. O Proxy renova os cookies antes deles.
        if (writable) values.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
