# ============================================================
#  BACKUP.ps1  -  IgrejasWeb System OS
#  1. Copia para HD externo   (E:\Projetos\igrejas-web-system-os)
#  2. Copia para OneDrive     (C:\Users\joaqu\OneDrive\Projetos\Igrejas-Web-System-OS)
#  3. Commit + Push GitHub
#
#  Uso manual:    .\BACKUP.ps1
#  Uso silencioso (agendado): .\BACKUP.ps1 -Silencioso
# ============================================================

param ([switch]$Silencioso)

$Origem    = "C:\Projetos\igrejas-web-system-os"
$Destinos  = @(
    "E:\Projetos\igrejas-web-system-os",
    "C:\Users\joaqu\OneDrive\Projetos\Igrejas-Web-System-OS"
)
$GitRemote = "https://github.com/IgrejasWebOS-System/Igrejas-Web-System-OS.git"
$DataHora  = Get-Date -Format "yyyy-MM-dd HH:mm"
$Excluidos = @("node_modules", ".next", ".git")

function Log($msg, $cor = "White") {
    if (-not $Silencioso) { Write-Host $msg -ForegroundColor $cor }
}

Log ""
Log "============================================================" Cyan
Log "   IGREJASWEB SYSTEM OS  |  BACKUP  |  $DataHora" White
Log "============================================================" Cyan
Log ""

# ── ETAPA 1 & 2: COPIAS LOCAIS ───────────────────────────────────────────────
foreach ($Destino in $Destinos) {

    Log "[COPIA] Destino: $Destino" Yellow
    Log "------------------------------------------------------------" Cyan

    $Disco = Split-Path -Qualifier $Destino
    if (!(Test-Path $Disco)) {
        Log "  [AVISO] Disco $Disco nao acessivel - pulando." DarkYellow
        Log ""
        continue
    }

    if (!(Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino -Force | Out-Null
        Log "  [+] Pasta criada: $Destino" Green
    }

    $XD = $Excluidos | ForEach-Object { "/XD"; $_ }
    $args = @($Origem, $Destino, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS") + $XD

    robocopy @args | Out-Null

    if ($LASTEXITCODE -le 7) {
        Log "  [OK] Copia concluida." Green
    } else {
        Log "  [ERRO] Robocopy retornou codigo $LASTEXITCODE" Red
    }

    Log ""
}

# ── ETAPA 3: GIT COMMIT + PUSH ───────────────────────────────────────────────
Log "[GIT] Atualizando repositorio GitHub..." Yellow
Log "------------------------------------------------------------" Cyan

Set-Location $Origem

if (!(Test-Path (Join-Path $Origem ".git"))) {
    Log "  [GIT] Inicializando repositorio..." DarkYellow
    git init
    git remote add origin $GitRemote
} else {
    $remoteAtual = git remote get-url origin 2>$null
    if ($remoteAtual -ne $GitRemote) {
        git remote set-url origin $GitRemote
        Log "  [GIT] Remote atualizado." DarkYellow
    }
}

$status = git status --porcelain
if ($status) {
    Log "  [GIT] Arquivos alterados - gerando commit..." Cyan
    git add -A
    $msg = "backup: $DataHora"
    git commit -m $msg
    if ($LASTEXITCODE -eq 0) {
        Log "  [OK] Commit: '$msg'" Green
    }
} else {
    Log "  [GIT] Sem alteracoes pendentes." DarkYellow
}

Log "  [GIT] Enviando para GitHub..." Cyan
git push origin HEAD

if ($LASTEXITCODE -eq 0) {
    Log "  [OK] Push realizado com sucesso." Green
} else {
    Log "  [ERRO] Push falhou - verifique credenciais/conexao." Red
}

Log ""
Log "============================================================" Green
Log "   BACKUP CONCLUIDO  |  $DataHora" Green
Log "============================================================" Green
Log ""
