# IgrejasWeb System OS — Instruções do Projeto

## Identidade do Projeto
Sistema de gestão eclesiástica multi-tenant com módulos configuráveis por ministério.
Substitui e unifica: IgrejasWebOS + portal-teologico-os.

## Stack
- Next.js 15 (App Router, Server Actions)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Storage)
- Vercel (deploy)
- GitHub (versionamento)

## Regras de Desenvolvimento

### Banco de Dados
- TODA tabela de dados DEVE ter `ministry_id uuid NOT NULL` como FK para `ministries`
- NUNCA criar tabela sem isolamento de tenant
- RLS deve ser habilitado em TODAS as tabelas
- Migrations em `/sql/migrations/` numeradas sequencialmente (004, 005...)

### Multi-tenant
- O contexto do ministério vem da sessão do usuário (`admin_roles.ministry_id`)
- NUNCA fazer SELECT sem filtro de `ministry_id` em Server Actions
- Módulos são controlados por `ministry_modules.is_active` — verificar antes de renderizar

### Hierarquia de Acesso
- 0 = Super-Master: acesso total, `ministry_id IS NULL` em `admin_roles`
- 1 = Master/Campo: controla tudo do seu campo
- 2 = Admin-Sede: controla sede + setores, emite convites
- 3 = Admin-Setor: controla igrejas do seu setor
- 4 = Usuário-Local: controla apenas sua congregação

### Party Pattern
- Cadastro de pessoas SEMPRE em `parties` (nunca tabela separada por tipo)
- Papeis (membro, aluno, etc.) em `party_roles`
- CPF é único por `ministry_id`

### Estrutura de Pastas
```
src/
  app/
    (auth)/         -- login, seletor de contexto
    (sistema)/      -- area autenticada
      dashboard/    -- modulo membros + igrejas
      escola/       -- modulo escola teologica
      cursos/       -- modulo cursos
      ebd/          -- modulo EBD
      financeiro/   -- modulo financeiro
      secretaria/   -- modulo secretaria
      admin/        -- painel super-master
  components/
    ui/             -- componentes genericos
    layout/         -- sidebar, header
  utils/
    supabase/       -- client.ts, server.ts
  types/            -- tipos TypeScript globais
sql/
  migrations/       -- SQLs numerados, executar em ordem
```

### Convenções de Código
- Server Components por padrão
- `"use client"` apenas quando necessário (formulários, estados)
- Server Actions em `actions.ts` junto à rota
- Sempre validar `ministry_id` da sessão antes de qualquer mutation

---

## TypeScript Strict — Padrões e Armadilhas

### Verificar antes de fazer push para Vercel
```powershell
npx tsc --noEmit
```
Mostra TODOS os erros de tipo de uma vez. O `next dev` (Turbopack) é leniente — não confiar nele para validação de tipos.

### 1. Supabase — joins retornam array, nunca objeto
Supabase infere joins como `T[]` mesmo quando são 1-to-1. TypeScript rejeita `as { nome: string }`.
```typescript
// ❌ ERRADO
const cat = row.fin_categories as { nome: string } | null;

// ✅ CORRETO
const cat = row.fin_categories as unknown as { nome: string } | null;
```

### 2. Auth — NUNCA importar de `@/utils/auth`
```typescript
// ✅ SEMPRE usar
import { getAuthContext, requireAuthContext, assertLevel } from "@/utils/supabase/auth-context";
```

- **Server Actions**: usar `getAuthContext()` + `assertLevel(ctx, N)` — assertLevel já aceita `null`
- **Pages/Layouts (Server Components)**: usar `requireAuthContext()` — redireciona para `/login` se null
- **API Routes**: usar `getAuthContext()` + `if (!ctx) return NextResponse.json({}, { status: 401 })`

### 3. assertLevel — aceita null, use AdminLevel para parâmetros
```typescript
// Se tiver parâmetro de nível em funções helper:
import type { AdminLevel } from "@/types";
async function getCtx(minLevel: AdminLevel = 3) { ... }
```

### 4. createClient() é async
```typescript
// ❌ ERRADO
const sb = createClient();

// ✅ CORRETO
const sb = await createClient();
```

### 5. useRef com tipo em React 19
```typescript
// ❌ ERRADO (React 19 strict rejeita)
const ref = useRef<ReturnType<typeof setTimeout>>();

// ✅ CORRETO
const ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
```

### 6. Objetos com propriedade duplicada
TypeScript rejeita objeto literal com a mesma chave duas vezes (ex: `background` em inline style). Verificar antes de usar spread ou copiar estilos.

### 7. Tipos de união — widening
```typescript
// ❌ TypeScript infere como `string`, não como union
const filter = { tipo: (sp.tipo as "A" | "B") || "" };

// ✅ Tipar o objeto explicitamente
const filter: MeuTipo = { tipo: (sp.tipo || "") as "A" | "B" };
```
