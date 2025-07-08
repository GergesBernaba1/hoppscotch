# SQL Server Dependencies Update Script

Write-Host "Updating dependencies for SQL Server support..." -ForegroundColor Cyan

# Install SQL Server related packages
npm install --save mssql
npm install --save-dev @types/mssql

# Update Prisma packages
npm install --save @prisma/client
npm install --save-dev prisma

# Generate fresh Prisma client based on updated schema
npx prisma generate

Write-Host "Dependencies updated successfully." -ForegroundColor Green
