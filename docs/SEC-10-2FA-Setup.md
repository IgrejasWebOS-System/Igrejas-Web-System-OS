# SEC-10 — Configuração de 2FA (MFA) para Usuários N0 e N1

> **Obrigatório para**: N0 (Super-Master) e N1 (Admin Campo)  
> **Plano Supabase**: Disponível no plano **Free** via TOTP (Authenticator App)  
> **Data de referência**: Junho 2026

---

## 1. Configuração no Supabase Dashboard

### Passo 1: Habilitar MFA no projeto

1. Acesse `Authentication > Sign In / Up`
2. Na seção **Multi-Factor Authentication**, ative o toggle de **TOTP**
3. Clique em **Save**

Isso habilita a infraestrutura de MFA — os usuários podem enrolar seus próprios dispositivos.

---

## 2. Enrolamento de Dispositivo pelo Usuário

Os usuários N0/N1 devem seguir este fluxo após o primeiro login:

1. Abrir um aplicativo autenticador (Google Authenticator, Authy, 1Password, etc.)
2. Na aplicação IgrejasWeb, a rota `/mfa/enrolar` (a ser implementada) exibirá um QR Code
3. Escanear o QR Code com o aplicativo
4. Inserir o código de 6 dígitos para confirmar o enrolamento
5. Guardar os **códigos de recuperação** gerados (offline, em local seguro)

### Código de referência para enrolamento (TOTP)

```typescript
// src/app/(auth)/mfa/enrolar/actions.ts
import { createClient } from "@/utils/supabase/server";

export async function iniciarEnrolamento2FA() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) throw error;
  // data.totp.qr_code — URL do QR code para exibir
  // data.totp.secret — secret manual (fallback)
  return data;
}

export async function confirmarEnrolamento2FA(factorId: string, code: string) {
  const supabase = await createClient();
  // Criar challenge
  const { data: challenge, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
  if (e1) throw e1;
  // Verificar código
  const { data, error: e2 } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (e2) throw e2;
  return data;
}
```

---

## 3. Verificação de 2FA no Login

O Supabase lida com o fluxo de MFA automaticamente quando habilitado. Após inserir email/senha, usuários enrolados verão o prompt de código TOTP.

Para verificar programaticamente se o usuário tem 2FA ativo:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const factors = user?.factors ?? [];
const has2FA = factors.some(f => f.factor_type === "totp" && f.status === "verified");
```

---

## 4. Política Organizacional Recomendada

| Nível | 2FA | Justificativa |
|-------|-----|---------------|
| N0 Super-Master | **Obrigatório** | Acesso a todos os ministérios, dados de todos os membros |
| N1 Admin Campo | **Obrigatório** | Gerencia múltiplas sedes, emite documentos |
| N2 Admin Sede | Recomendado | Acesso a dados da sede e setores |
| N3 Admin Setor | Opcional | Escopo limitado |
| N4 Usuário Local | Opcional | Consulta apenas |

---

## 5. Aplicação de Política via Middleware (Futuro)

Para **forçar** 2FA em nível de código (impedir acesso sem 2FA verificado):

```typescript
// Em middleware.ts — verificar AAL (Authenticator Assurance Level)
const { data: { session } } = await supabase.auth.getSession();
const aal = session?.user?.factors?.length ? "aal2" : "aal1";

const isAdminRoute = pathname.startsWith("/dashboard/admin");
const isN0orN1 = (user.app_metadata?.iw_level as number) <= 1;

if (isAdminRoute && isN0orN1 && aal !== "aal2") {
  return NextResponse.redirect(new URL("/mfa/verificar", request.url));
}
```

> **Nota**: A implementação completa desta checagem requer a rota `/mfa/verificar` e integração com `supabase.auth.mfa.challenge()` e `supabase.auth.mfa.verify()`.

---

## 6. Status de Implementação

- [x] **Infraestrutura MFA habilitada** no Supabase (Free plan — TOTP)
- [x] **Documentação** de configuração e política (este documento)
- [ ] **Rota `/mfa/enrolar`** — formulário com QR Code + confirmação
- [ ] **Rota `/mfa/verificar`** — prompt de código no fluxo de login
- [ ] **Middleware enforcement** — bloquear N0/N1 sem AAL2
- [ ] **Recuperação de acesso** — códigos de backup
