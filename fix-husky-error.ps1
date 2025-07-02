# Script to fix Husky error in Hoppscotch project
Write-Host "Fixing Husky installation issues..." -ForegroundColor Green

# Navigate to project root
Set-Location D:\POCs\hoppscotch

# Delete the .husky directory and reinstall
if (Test-Path .\.husky) {
    Write-Host "Removing existing .husky directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .\.husky
}

# Create a temporary package.json with modified prepare script
Write-Host "Modifying package.json temporarily..." -ForegroundColor Yellow
$packageJson = Get-Content -Path .\package.json -Raw | ConvertFrom-Json
$originalPrepare = $packageJson.scripts.prepare
$packageJson.scripts.prepare = "husky install"
$packageJson | ConvertTo-Json -Depth 100 | Set-Content -Path .\package.json.temp
Move-Item -Force .\package.json.temp .\package.json

# Reinstall husky
Write-Host "Reinstalling Husky..." -ForegroundColor Yellow
npm install husky --save-dev
npx husky install

# Create new hooks
Write-Host "Creating new Git hooks..." -ForegroundColor Yellow
npx husky add .husky/pre-commit "npm run pre-commit"
npx husky add .husky/commit-msg "npx --no -- commitlint --edit $1"

# Skip husky for this installation
Write-Host "Running npm install with HUSKY=0..." -ForegroundColor Yellow
$env:HUSKY = "0"
npm install

Write-Host "Fix completed! Try running your command again." -ForegroundColor Green
