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

# Permite executar pelo Explorer, VS Code ou por um terminal aberto em outra pasta.
if ($PSScriptRoot) {
  Set-Location -LiteralPath $PSScriptRoot
}

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

function Assert-NativeSuccess {
  param([string]$Action)
  if ($LASTEXITCODE -ne 0) {
    throw "$Action falhou (codigo de saida: $LASTEXITCODE). Consulte a mensagem acima."
  }
}

Ensure-Command git
if (-not $SkipBuild) { Ensure-Command npm }

# --- Garante que estamos num repositorio Git (inicializa se preciso) ---
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
  Write-Step "Inicializando repositorio Git"
  git init
  Assert-NativeSuccess "Inicializacao do repositorio Git"
  $repoRoot = git rev-parse --show-toplevel
  Assert-NativeSuccess "Identificacao da raiz do repositorio"
}
Set-Location $repoRoot

Write-Step "Repositorio"
Write-Host "Pasta: $repoRoot"

# --- Garante o remote 'origin' ---
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  Write-Host "Remote 'origin' ausente. Configurando para $RemoteUrl" -ForegroundColor Yellow
  git remote add origin $RemoteUrl
  Assert-NativeSuccess "Configuracao do remote origin"
  $remote = $RemoteUrl
}
Write-Host "Origin: $remote"

# --- Garante uma branch (primeiro commit ainda nao tem branch) ---
$branch = git branch --show-current
if (-not $branch) {
  $branch = $DefaultBranch
  git checkout -B $branch
  Assert-NativeSuccess "Criacao da branch $branch"
}
Write-Host "Branch: $branch"

# --- Trava de seguranca: nunca commitar arquivos .env reais ---
# Modelos como .env.example, .env.sample e .env.template podem ser versionados.
$trackedEnv = git ls-files | Where-Object {
  $fileName = [System.IO.Path]::GetFileName($_)
  $isEnvironmentFile = $fileName -eq ".env" -or $fileName.StartsWith(".env.")
  $isSafeTemplate = $fileName -match '\.(example|sample|template)$'
  $isEnvironmentFile -and -not $isSafeTemplate
}
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
  Assert-NativeSuccess "Build de producao"
}

# --- Verifica alteracoes ---
Write-Step "Verificando alteracoes"
$status = git status --porcelain
if (-not $status) {
  Write-Host "Nenhuma alteracao para enviar." -ForegroundColor Yellow
} else {
  git status --short
  Write-Step "Commit"
  git add -A
  Assert-NativeSuccess "Preparacao dos arquivos para commit"
  git diff --cached --quiet
  $hasStagedChanges = $LASTEXITCODE -eq 1
  if ($LASTEXITCODE -notin @(0, 1)) {
    Assert-NativeSuccess "Verificacao dos arquivos preparados"
  }

  if (-not $hasStagedChanges) {
    Write-Host "Nenhuma alteracao staged para commitar." -ForegroundColor Yellow
  } else {
    Write-Host "Criando commit: $Message" -ForegroundColor DarkGray
    git commit -m $Message
    Assert-NativeSuccess "Commit"
  }
}

# --- Sincroniza antes do push para evitar rejeicao fetch first ---
Write-Step "Sincronizando com o GitHub"
git fetch origin
Assert-NativeSuccess "Atualizacao das referencias remotas"

$remoteBranchExists = $false
git show-ref --verify --quiet "refs/remotes/origin/$branch"
if ($LASTEXITCODE -eq 0) {
  $remoteBranchExists = $true
} elseif ($LASTEXITCODE -ne 1) {
  Assert-NativeSuccess "Verificacao da branch remota origin/$branch"
}

if ($remoteBranchExists) {
  $behind = git rev-list --count "$branch..origin/$branch"
  Assert-NativeSuccess "Calculo da divergencia com origin/$branch"

  if ([int]$behind -gt 0) {
    Write-Host "O GitHub possui $behind commit(s) novo(s). Aplicando rebase..." -ForegroundColor Yellow
    git rebase "origin/$branch"
    if ($LASTEXITCODE -ne 0) {
      Write-Host ""
      Write-Host "O rebase encontrou conflitos. Resolva os arquivos indicados e execute:" -ForegroundColor Red
      Write-Host "  git add <arquivos-resolvidos>" -ForegroundColor Yellow
      Write-Host "  git rebase --continue" -ForegroundColor Yellow
      Write-Host "Depois execute este script novamente." -ForegroundColor Yellow
      throw "Sincronizacao interrompida por conflitos de rebase."
    }
  } else {
    Write-Host "Branch local ja contem as alteracoes remotas." -ForegroundColor DarkGray
  }
}

# --- Push (define upstream no primeiro envio) ---
Write-Step "Push"
$hasUpstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null
if (-not $hasUpstream) {
  Write-Host "Primeiro push: definindo upstream origin/$branch" -ForegroundColor Yellow
  git push -u origin $branch
  Assert-NativeSuccess "Primeiro push para origin/$branch"
} else {
  git push origin $branch
  Assert-NativeSuccess "Push para origin/$branch"
}

Write-Host ""
Write-Host "Upload para o GitHub concluido com sucesso." -ForegroundColor Green
