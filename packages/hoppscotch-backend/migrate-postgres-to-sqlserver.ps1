# PostgreSQL to SQL Server Migration Script

param (
    [Parameter(Mandatory = $true)]
    [string]$PgHost,
    
    [Parameter(Mandatory = $true)]
    [string]$PgPort,
    
    [Parameter(Mandatory = $true)]
    [string]$PgDatabase,
    
    [Parameter(Mandatory = $true)]
    [string]$PgUsername,
    
    [Parameter(Mandatory = $true)]
    [string]$PgPassword,
    
    [Parameter(Mandatory = $true)]
    [string]$SqlServerHost,
    
    [Parameter(Mandatory = $true)]
    [string]$SqlServerPort,
    
    [Parameter(Mandatory = $true)]
    [string]$SqlServerDatabase,
    
    [Parameter(Mandatory = $true)]
    [string]$SqlServerUsername,
    
    [Parameter(Mandatory = $true)]
    [string]$SqlServerPassword
)

Write-Host "Starting PostgreSQL to SQL Server migration..." -ForegroundColor Cyan

# Step 1: Export the Prisma schema
Write-Host "Exporting the current Prisma schema..." -ForegroundColor Cyan
$env:DATABASE_URL = "postgresql://${PgUsername}:${PgPassword}@${PgHost}:${PgPort}/${PgDatabase}"
npx prisma db pull

# Step 2: Create SQL Server database if it doesn't exist
Write-Host "Creating SQL Server database if it doesn't exist..." -ForegroundColor Cyan
$serverInstance = "${SqlServerHost},${SqlServerPort}"
$createDbQuery = "IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = '$SqlServerDatabase') CREATE DATABASE $SqlServerDatabase"

try {
    Invoke-Sqlcmd -ServerInstance $serverInstance -Username $SqlServerUsername -Password $SqlServerPassword -Query $createDbQuery -TrustServerCertificate
}
catch {
    Write-Host "Error creating database: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Update Prisma schema to use SQL Server
Write-Host "Updating Prisma schema for SQL Server..." -ForegroundColor Cyan
$prismaSchema = Get-Content -Path ".\prisma\schema.prisma"
$updatedSchema = $prismaSchema -replace "provider = `"postgresql`"", "provider = `"sqlserver`""
$updatedSchema | Set-Content -Path ".\prisma\schema.prisma"

# Step 4: Apply SQL Server schema
Write-Host "Applying schema to SQL Server..." -ForegroundColor Cyan
$env:DATABASE_URL = "sqlserver://${SqlServerUsername}:${SqlServerPassword}@${SqlServerHost}:${SqlServerPort};database=${SqlServerDatabase};trustServerCertificate=true;multipleActiveResultSets=true"
npx prisma db push

Write-Host "Schema migration completed." -ForegroundColor Green

# Step 5: Export PostgreSQL data
Write-Host "Exporting data from PostgreSQL..." -ForegroundColor Cyan

# Set up export directories
$exportDir = ".\migration-data"
New-Item -Path $exportDir -ItemType Directory -Force | Out-Null

# Use pg_dump to export data (requires PostgreSQL client tools)
try {
    $env:PGPASSWORD = $PgPassword
    $tablesList = & psql -h $PgHost -p $PgPort -U $PgUsername -d $PgDatabase -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public'"
    
    foreach ($table in $tablesList) {
        $tableName = $table.Trim()
        if ($tableName) {
            Write-Host "Exporting table: $tableName" -ForegroundColor Cyan
            & pg_dump -h $PgHost -p $PgPort -U $PgUsername -d $PgDatabase -t $tableName --data-only --column-inserts -f "$exportDir\$tableName.sql"
        }
    }
    
    Write-Host "PostgreSQL data export completed." -ForegroundColor Green
}
catch {
    Write-Host "Error exporting PostgreSQL data: $_" -ForegroundColor Red
}

# Step 6: Convert PostgreSQL exports to SQL Server format and import
Write-Host "Converting and importing data to SQL Server..." -ForegroundColor Cyan

# Modify SQL files for SQL Server compatibility
$sqlFiles = Get-ChildItem -Path $exportDir -Filter "*.sql"
foreach ($file in $sqlFiles) {
    Write-Host "Converting: $($file.Name)" -ForegroundColor Cyan
    $content = Get-Content -Path $file.FullName -Raw
    
    # Replace PostgreSQL-specific syntax with SQL Server syntax
    $content = $content -replace "true", "1"
    $content = $content -replace "false", "0"
    $content = $content -replace "NULL::text", "NULL"
    $content = $content -replace "NULL::integer", "NULL"
    $content = $content -replace "::timestamp with time zone", ""
    $content = $content -replace "::timestamp without time zone", ""
    $content = $content -replace "nextval\('.*'\)", "DEFAULT"
    
    # Write modified content
    $content | Set-Content -Path "$exportDir\converted_$($file.Name)"
    
    # Import to SQL Server
    try {
        Invoke-Sqlcmd -ServerInstance $serverInstance -Database $SqlServerDatabase -Username $SqlServerUsername -Password $SqlServerPassword -InputFile "$exportDir\converted_$($file.Name)" -TrustServerCertificate
        Write-Host "Imported: $($file.Name)" -ForegroundColor Green
    }
    catch {
        Write-Host "Error importing $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host "Migration completed successfully!" -ForegroundColor Green
