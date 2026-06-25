import type { NextConfig } from "next";

// ── Headers de segurança HTTP (SEC-6) ────────────────────────────────────────
// Aplicados em todas as respostas. Defesa em profundidade contra XSS,
// clickjacking, MIME sniffing e vazamento de informações.
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const securityHeaders = [
  // Impede que a página seja embutida em iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },

  // Impede MIME sniffing (execução de scripts disfarçados)
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Controla informações enviadas no Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Desativa APIs sensíveis não utilizadas
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },

  // HSTS: força HTTPS por 1 ano (ativar apenas em produção)
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),

  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js App Router usa inline scripts para hidratação
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Estilos inline e Google Fonts
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      // Fontes
      "font-src 'self' fonts.gstatic.com data:",
      // Imagens: próprio domínio + Supabase Storage + data URIs
      `img-src 'self' data: blob: ${SUPABASE_HOST} *.supabase.co`,
      // Conexões: próprio domínio + Supabase API
      `connect-src 'self' ${SUPABASE_HOST} *.supabase.co wss://*.supabase.co`,
      // Frames: nenhum
      "frame-src 'none'",
      // Objetos: nenhum
      "object-src 'none'",
      // Base URI restrita ao próprio domínio
      "base-uri 'self'",
      // Formulários só para próprio domínio
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Aplicar em todas as rotas
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
