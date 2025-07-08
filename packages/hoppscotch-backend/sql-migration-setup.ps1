# SQL Server Migration Setup Script

# Install required packages
Write-Host "Installing required packages for SQL Server migration..." -ForegroundColor Cyan
npm install --save @prisma/client
npm install --save-dev prisma
npm install --save mssql
npm install --save-dev typescript ts-node

# Install SQL Server Migration Assistant if not already installed
$ssmaDownloadUrl = "https://aka.ms/ssmaforazure"
Write-Host "Please download and install SQL Server Migration Assistant for PostgreSQL from: $ssmaDownloadUrl" -ForegroundColor Yellow
Write-Host "After installation, you can use SSMA to migrate schema and data from PostgreSQL to SQL Server." -ForegroundColor Yellow

Write-Host "Setup completed." -ForegroundColor Green
