# ============================================================
#  INICIAR_PROJETO.ps1
#  Execute este script UMA UNICA VEZ para criar o projeto Next.js
#  Local: C:\Projetos\igrejas-web-system-os
# ============================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  IgrejasWeb System OS -- Inicializacao" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ir para a pasta pai
Set-Location -Path "C:\Projetos"

# Criar projeto Next.js com as opcoes corretas
Write-Host "[1/3] Criando projeto Next.js 15..." -ForegroundColor Yellow
npx create-next-app@latest igrejas-web-system-os `
  --typescript `
  --tailwind `
  --eslint `
  --app `
  --src-dir `
  --import-alias "@/*" `
  --use-npm

Write-Host ""
Write-Host "[2/3] Instalando dependencias adicionais..." -ForegroundColor Yellow
Set-Location -Path "C:\Projetos\igrejas-web-system-os"
npm install @supabase/supabase-js @supabase/ssr lucide-react

Write-Host ""
Write-Host "[3/3] Configurando arquivo de ambiente..." -ForegroundColor Yellow
Copy-Item ".env.local.example" ".env.local"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  PROJETO CRIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host "  1. Abra .env.local e preencha as chaves do Supabase" -ForegroundColor White
Write-Host "  2. Execute as migrations SQL no Supabase (pasta sql/migrations/)" -ForegroundColor White
Write-Host "  3. npm run dev" -ForegroundColor White
Write-Host ""
