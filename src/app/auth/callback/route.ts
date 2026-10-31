import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfiguration } from "@/server/auth/configuration";
import { createSupabaseServerClient } from "@/server/providers/supabase/server";
import { safeRedirect } from "@/domain/auth";
import { preventSharedCache } from "@/lib/auth-response";

export async function GET(request: NextRequest) {
  const { origin } = getAuthConfiguration();
  if (!origin) return preventSharedCache(new NextResponse("URL da aplicação não configurada.", { status: 503 }));
  const code = request.nextUrl.searchParams.get("code");
  const client = await createSupabaseServerClient(true);
  if (client && code && /^[a-zA-Z0-9_-]{10,512}$/.test(code)) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await client.auth.getUser();
      if (data.user) return preventSharedCache(NextResponse.redirect(new URL(safeRedirect(request.nextUrl.searchParams.get("next"), "/workspaces"), origin)));
    }
  }
  return preventSharedCache(NextResponse.redirect(new URL("/login?aviso=link", origin)));
}
