"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { PublicSupabaseConfig } from "@/lib/supabase/public-config";

export function SessionEvents({ config }: { config: PublicSupabaseConfig }) {
  const router = useRouter();
  useEffect(() => {
    const client = createSupabaseBrowserClient(config);
    // Eventos melhoram a interface; a identidade e a autorização continuam no servidor.
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login?aviso=sessao");
      if (event === "TOKEN_REFRESHED") router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [config, router]);
  return null;
}
