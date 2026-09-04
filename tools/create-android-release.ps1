param(
  [Parameter(Mandatory = $false)]
  [string]$Version = "",

  [Parameter(Mandatory = $false)]
  [switch]$Push
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not $Version) {
  $package = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
  $Version = $package.version
}

if ($Version -notmatch '^\d+\.\d+\.\d+([.-][A-Za-z0-9]+)?$') {
  throw "Version '$Version' does not look like an Android release version. Use something like 0.1.1."
}

$tag = "android-release-$Version"
$existing = git tag --list $tag
if ($existing) {
  throw "Tag '$tag' already exists. Choose a new version or delete the old tag intentionally."
}

$status = git status --porcelain --untracked-files=no
if ($status) {
  throw "Tracked files are not clean. Commit or stash tracked changes before creating an Android release tag."
}

git tag -a $tag -m "DiaryDock Android internal release $Version"

if ($Push) {
  git push origin $tag
  Write-Host "Created and pushed $tag. Codemagic should start the signed Android App Bundle workflow."
} else {
  Write-Host "Created $tag."
  Write-Host "Push it with: git push origin $tag"
}
