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
