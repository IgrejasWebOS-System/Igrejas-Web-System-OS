# 🚀 Deploy na Vercel — IgrejasWeb System OS v4.1

> Roteiro completo para publicar a demo e compartilhar com o cliente.

---

## PRÉ-REQUISITOS

- [ ] Conta na Vercel: https://vercel.com (plano Hobby é gratuito)
- [ ] Git com o projeto já commitado
- [ ] Projeto Supabase criado com as migrations 001–038 executadas
- [ ] Node.js 20+ instalado localmente

---

## PASSO 1 — Verificar variáveis de ambiente necessárias

O projeto precisa de exatamente estas variáveis. Abra o Supabase → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXXXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Opcional (para módulos com integrações externas):
```
WHATSAPP_VERIFY_TOKEN=qualquer-string-secreta-sua
```

> ⚠️ NUNCA exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend. Ela é usada apenas em Server Actions/API Routes (lado servidor).

---

## PASSO 2 — Criar arquivo .env.local (só para teste local antes do deploy)

Crie o arquivo na raiz do projeto:
```
C:\Projetos\igrejas-web-system-os\.env.local
```

Com o conteúdo:
```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
WHATSAPP_VERIFY_TOKEN=demo-token-2026
```

Teste local:
```bash
cd C:\Projetos\igrejas-web-system-os
npm run dev
```

Acesse http://localhost:3000 e confirme que o login funciona.

---

## PASSO 3 — Fazer commit de tudo no Git

No terminal (dentro da pasta do projeto):

```bash
cd C:\Projetos\igrejas-web-system-os

# Verificar o que está pendente
git status

# Adicionar tudo
git add .

# Commit
git commit -m "feat: v4.1 — plataforma completa + runtime fixes pós-deploy"

# Push para o repositório (GitHub/GitLab)
git push origin main
```

> Se o projeto ainda não tem repositório remoto, crie um em https://github.com/new e conecte:
> ```bash
> git remote add origin https://github.com/SEU-USUARIO/igrejas-web-system.git
> git push -u origin main
> ```

---

## PASSO 4 — Importar o projeto na Vercel

1. Acesse https://vercel.com e faça login
2. Clique em **"Add New… → Project"**
3. Conecte sua conta GitHub (ou GitLab) se ainda não conectou
4. Selecione o repositório **igrejas-web-system-os**
5. Clique em **"Import"**

---

## PASSO 5 — Configurar as variáveis de ambiente na Vercel

Na tela de configuração do projeto (antes de clicar em Deploy):

1. Expanda a seção **"Environment Variables"**
2. Adicione cada variável:

| Nome | Valor | Ambientes |
|------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview, Development |
| `WHATSAPP_VERIFY_TOKEN` | `demo-token-2026` | Production, Preview |

3. Clique em **"Deploy"**

---

## PASSO 6 — Aguardar o build

O build do Next.js leva ~2–3 minutos. Você verá o log em tempo real. O que esperar:

```
✓ Compiled successfully
✓ Generating static pages (X/Y)
✓ Finalizing page optimization
```

Se aparecer erro de build, veja a seção **Troubleshooting** abaixo.

---

## PASSO 7 — Configurar domínio customizado (opcional)

Após o deploy, a Vercel gera um domínio automático como:
```
igrejas-web-system-os.vercel.app
```

Para um domínio personalizado (ex: `demo.igrejaswebsystem.com.br`):
1. Vercel → Project → Settings → Domains
2. Adicione o domínio
3. Configure o DNS apontando para os servidores da Vercel

---

## PASSO 8 — Configurar Supabase para aceitar o domínio

No Supabase → Authentication → URL Configuration:

- **Site URL**: `https://SEU-PROJETO.vercel.app`
- **Redirect URLs**: adicione `https://SEU-PROJETO.vercel.app/**`

Isso é necessário para o fluxo de login funcionar corretamente em produção.

---

## PASSO 9 — Testar a demo

Acesse a URL gerada pela Vercel. Teste com os usuários de demonstração (criados na migration 004):

| Usuário | Nível | E-mail |
|---------|-------|--------|
| Super Master | N0 | `n0.supermaster@demo.iw` |
| Admin Campo | N1 | `n1.admin@demo.iw` |
| Admin Sede | N2 | `n2.sede@demo.iw` |
| Admin Setor | N3 | `n3.setor@demo.iw` |
| Usuário | N4 | `n4.usuario@demo.iw` |

> Senha padrão de todos os usuários de teste: conforme definido na migration 004.

---

## TROUBLESHOOTING — Erros comuns no build

### ❌ "Module not found: Can't resolve 'X'"
Algum pacote está sendo importado mas não está no `package.json`.
```bash
npm install nome-do-pacote
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push
```

### ❌ "A 'use server' file can only export async functions"
Arquivo `actions.ts` com constantes exportadas. Mova para `constants.ts`. (Já corrigido em v4.1 para todos os módulos conhecidos.)

### ❌ Build lento ou timeout
Next.js 15 com Turbopack é rápido em dev, mas o build de produção usa o compilador padrão. Tempo normal: 2–5 min.

### ❌ Login não funciona em produção
Verifique se as `Redirect URLs` no Supabase incluem o domínio da Vercel.

### ❌ "supabaseUrl is required"
A variável `NEXT_PUBLIC_SUPABASE_URL` não está configurada na Vercel. Verifique em Project → Settings → Environment Variables.

---

## ATUALIZAR A DEMO (deploys futuros)

Sempre que fizer mudanças no código:

```bash
git add .
git commit -m "fix: descrição do que foi corrigido"
git push
```

A Vercel faz redeploy automaticamente a cada push para `main`. O cliente verá a versão atualizada em ~2 minutos.

---

## COMPARTILHAR COM O CLIENTE

Após o deploy, envie a URL:
```
https://SEU-PROJETO.vercel.app
```

Junto com as credenciais de demonstração de cada nível de acesso (N0 a N4) para o cliente explorar diferentes perspectivas do sistema.

> **Dica**: Crie um usuário de demonstração específico para o cliente (N2 ou N3) para que ele explore com dados realistas sem ter acesso às configurações de super master.
