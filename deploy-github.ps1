# =============================================================
# deploy-github.ps1 — Essência dos Livros
# Sobe o projeto para o GitHub automaticamente.
#
# Uso (PowerShell, dentro da pasta do projeto):
#   .\deploy-github.ps1                      # build + commit + push
#   .\deploy-github.ps1 -Message "minha msg" # mensagem de commit custom
#   .\deploy-github.ps1 -SkipBuild           # pula o build de produção
# =============================================================
param(
  [string]$Message = "Update project",
  [switch]$SkipBuild,
  [string]$RemoteUrl = "https://github.com/rafaelbalbinoprojetos/essenciadoslivros.git",
  [string]$DefaultBranch = "main"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Text)
  Write-Host ""
  Write-Host "==> $Text" -ForegroundColor Cyan
}

function Ensure-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando '$Name' nao encontrado no PATH."
  }
}

Ensure-Command git
if (-not $SkipBuild) { Ensure-Command npm }

# --- Garante que estamos num repositorio Git (inicializa se preciso) ---
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
  Write-Step "Inicializando repositorio Git"
  git init | Out-Null
  $repoRoot = git rev-parse --show-toplevel
}
Set-Location $repoRoot

Write-Step "Repositorio"
Write-Host "Pasta: $repoRoot"

# --- Garante o remote 'origin' ---
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Write-Host "Remote 'origin' ausente. Configurando para $RemoteUrl" -ForegroundColor Yellow
  git remote add origin $RemoteUrl
  $remote = $RemoteUrl
}
Write-Host "Origin: $remote"

# --- Garante uma branch (primeiro commit ainda nao tem branch) ---
$branch = git branch --show-current
if (-not $branch) {
  $branch = $DefaultBranch
  git checkout -B $branch | Out-Null
}
Write-Host "Branch: $branch"

# --- Trava de seguranca: nunca commitar arquivos .env ---
$trackedEnv = git ls-files | Where-Object { $_ -match '(^|/)\.env(\.|$)' }
if ($trackedEnv) {
  Write-Host ""
  Write-Host "ATENCAO: arquivos .env estao sendo rastreados pelo Git:" -ForegroundColor Red
  $trackedEnv | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  throw "Remova-os do controle de versao antes (git rm --cached <arquivo>) para nao vazar segredos."
}

# --- Build de producao (opcional) ---
if (-not $SkipBuild) {
  Write-Step "Build de producao"
  npm run build
}

# --- Verifica alteracoes ---
Write-Step "Verificando alteracoes"
$status = git status --porcelain
if (-not $status) {
  Write-Host "Nenhuma alteracao para enviar." -ForegroundColor Yellow
} else {
  git status --short
  Write-Step "Commit"
  git add .
  $staged = git diff --cached --name-only
  if (-not $staged) {
    Write-Host "Nenhuma alteracao staged para commitar." -ForegroundColor Yellow
  } else {
    git commit -m $Message
  }
}

# --- Push (define upstream no primeiro envio) ---
Write-Step "Push"
$hasUpstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null
if (-not $hasUpstream) {
  Write-Host "Primeiro push: definindo upstream origin/$branch" -ForegroundColor Yellow
  git push -u origin $branch
} else {
  git push origin $branch
}

Write-Host ""
Write-Host "Upload para o GitHub concluido com sucesso." -ForegroundColor Green
