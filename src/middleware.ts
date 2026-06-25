/**
 * middleware.ts — Proteção de rotas no Edge
 * ─────────────────────────────────────────────────────────────────────────────
 * Executado ANTES de qualquer componente ou route handler.
 * Responsabilidades:
 *   1. Redirecionar para /login se não houver sessão válida do Supabase
 *   2. Redirecionar para /dashboard se nível insuficiente para rotas admin
 *   3. Refreshar o token do Supabase quando necessário
 *
 * SEC-1: O nível de autorização é lido de user.app_metadata (assinado pelo
 *        Supabase — não manipulável pelo cliente).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que não exigem autenticação
const PUBLIC_PATHS = ["/login", "/auth", "/_next", "/favicon", "/api/health"];

// Rotas que exigem nível N0 ou N1
const ADMIN_PATHS = ["/dashboard/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Não processar rotas públicas ou assets
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Criar resposta mutável para que o @supabase/ssr possa atualizar cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() verifica o JWT no servidor — confiável
  const { data: { user } } = await supabase.auth.getUser();

  // ── 1. Sem sessão → redirecionar para /login ──────────────────
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Rota admin sem nível suficiente → redirecionar ─────────
  const isAdminRoute = ADMIN_PATHS.some(p => pathname.startsWith(p));
  if (isAdminRoute) {
    const level = (user.app_metadata?.iw_level as number | undefined) ?? 99;
    if (level > 1) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // ── 3. Usuário autenticado mas sem contexto selecionado ────────
  // Se tentar acessar /dashboard sem ter selecionado ministério (sem app_metadata),
  // redirecionar para /contexto (o seletor de ministério).
  if (pathname.startsWith("/dashboard")) {
    const hasContext = user.app_metadata?.iw_ministry_id;
    if (!hasContext) {
      return NextResponse.redirect(new URL("/contexto", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas EXCETO:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
