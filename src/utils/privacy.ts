/**
 * privacy.ts — Utilitários de privacidade e LGPD (SEC-8)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mascaramento de dados pessoais em listagens e exportações.
 * Dados completos são exibidos apenas na ficha individual,
 * onde o acesso é mais intencional e pode ser logado.
 */

// ── CPF ───────────────────────────────────────────────────────────────────────
// Em lista: ***.***.789-**   (expõe apenas os 3 dígitos do meio)
// Na ficha: 123.456.789-09  (completo)

export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf; // não é CPF válido, retorna como está
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

// ── E-mail ────────────────────────────────────────────────────────────────────
// Em lista: j***@gmail.com
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const masked = user[0] + "***";
  return `${masked}@${domain}`;
}

// ── Telefone ──────────────────────────────────────────────────────────────────
// Em lista: (11) 9****-5678
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) ****-${last4}`;
}

// ── Data de nascimento ────────────────────────────────────────────────────────
// Em lista: **/**/1985  (oculta dia e mês, mostra apenas ano)
export function maskBirthDate(date: string | null | undefined): string {
  if (!date) return "—";
  const year = date.slice(0, 4);
  if (!year || isNaN(Number(year))) return "—";
  return `**/**/${year}`;
}

// ── Validação de URL de imagem (SEC-9) ────────────────────────────────────────
// Previne SSRF e carregamento de imagens de domínios maliciosos.
// Apenas URLs do Supabase Storage e de domínios explicitamente autorizados.
const ALLOWED_IMAGE_HOSTS = [
  // Supabase Storage (todos os projetos)
  /^[a-z0-9]+\.supabase\.co$/,
  /^[a-z0-9]+\.supabase\.in$/,
  // CDN alternativo do Supabase
  /^[a-z0-9-]+\.supabase\.net$/,
];

export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Deve ser HTTPS
    if (parsed.protocol !== "https:") return false;
    // Hostname deve estar na lista de domínios permitidos
    return ALLOWED_IMAGE_HOSTS.some((pattern) => pattern.test(parsed.hostname));
  } catch {
    // URL inválida
    return false;
  }
}

// Retorna a URL se segura, ou null — para uso em <img src>
export function safeImageUrl(url: string | null | undefined): string | null {
  return isSafeImageUrl(url) ? url! : null;
}
