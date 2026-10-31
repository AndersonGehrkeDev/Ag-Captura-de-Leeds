import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { parsePublicSupabaseConfig } from "@/lib/supabase/public-config";
import { preventSharedCache } from "@/lib/auth-response";
import { applicationOrigin, safeRedirect } from "@/domain/auth";

const privateRoots = ["/mapa", "/campanhas", "/modelos", "/relatorios", "/leads", "/base", "/configuracoes", "/prospeccao", "/perfil", "/workspaces", "/workspace"];
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/prospeccao/demonstracao") return NextResponse.next();
  let response = NextResponse.next({ request });
  const config = parsePublicSupabaseConfig(process.env);
  const origin = applicationOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const protectedPage = privateRoots.some((root) => request.nextUrl.pathname === root || request.nextUrl.pathname.startsWith(root + "/"));
  let authenticated = false;
  if (config) {
    const client = createServerClient<Database>(config.url, config.key, {
      cookieOptions: { path: "/", sameSite: "lax", secure: origin?.startsWith("https:") },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, cacheHeaders) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          const previous = response;
          response = NextResponse.next({ request });
          previous.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });
    const { data, error } = await client.auth.getUser();
    authenticated = !error && !!data.user;
  }
  if (protectedPage && !authenticated) {
    if (!origin) return preventSharedCache(new NextResponse("URL da aplicação não configurada corretamente.", { status: 503 }));
    const url = new URL("/login", origin);
    url.searchParams.set("next", safeRedirect(request.nextUrl.pathname));
    url.searchParams.set("aviso", config ? "sessao" : "configuracao");
    const redirected = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  return preventSharedCache(response);
}
export const config = { matcher: ["/api/gestao", "/mapa/:path*", "/campanhas/:path*", "/modelos/:path*", "/relatorios/:path*", "/api/crm", "/leads/:path*", "/api/mensagens", "/api/auditorias", "/api/prospeccao", "/base/:path*", "/configuracoes/:path*", "/prospeccao/:path*", "/perfil/:path*", "/workspaces/:path*", "/workspace/:path*", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/auth/:path*"] };
