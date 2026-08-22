# EDECS edel — one-click push (paste token when asked)
Set-Location $PSScriptRoot
$env:GIT_ASKPASS = ""

Write-Host ""
Write-Host "=== Push to github.com/Edecs/edel ===" -ForegroundColor Cyan
Write-Host "1) Open: https://github.com/settings/tokens/new" -ForegroundColor Yellow
Write-Host "   -> Generate new token (classic) -> check 'repo' -> Generate" -ForegroundColor Yellow
Write-Host "2) If Edecs org uses SSO: Authorize token for Edecs on tokens page" -ForegroundColor Yellow
Write-Host ""
$token = Read-Host "Paste token here (ghp_... or github_pat_...) then Enter"

if ([string]::IsNullOrWhiteSpace($token) -or $token -match "PASTE") {
  Write-Host "ERROR: Paste the REAL token from GitHub, not placeholder text." -ForegroundColor Red
  exit 1
}

$url = "https://x-access-token:$token@github.com/Edecs/edel.git"
Write-Host ""
Write-Host "Pushing..." -ForegroundColor Green
git -c credential.helper= push $url main --force

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "SUCCESS! Code is on GitHub." -ForegroundColor Green
  Write-Host "Delete the token now: https://github.com/settings/tokens" -ForegroundColor Yellow
} else {
  Write-Host ""
  Write-Host "FAILED. Common fixes:" -ForegroundColor Red
  Write-Host "  - Use Classic token with 'repo' scope" -ForegroundColor Red
  Write-Host "  - Authorize SSO for Edecs org" -ForegroundColor Red
  Write-Host "  - Ask admin for Write access on Edecs/edel" -ForegroundColor Red
}
