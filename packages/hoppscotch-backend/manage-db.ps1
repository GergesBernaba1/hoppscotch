# Hoppscotch SQL Server Database Management Script
# This script provides common database operations for the Hoppscotch backend

param (
    [Parameter(Mandatory = $false)]
    [ValidateSet("check", "push", "reset", "generate", "migrate")]
    [string]$Operation = "check",
    
    [Parameter(Mandatory = $false)]
    [string]$MigrationName = "",
    
    [Parameter(Mandatory = $false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$AcceptDataLoss = $false
)

# Set the database connection string
$Env:DATABASE_URL = "sqlserver://db.expertapps.com.sa:1444;database=hoppscotch;user=sa;password=IqUB6l6sA725;trustServerCertificate=true;multipleActiveResultSets=true;applicationIntent=ReadWrite"

function Get-DatabaseTables {
    $server = "db.expertapps.com.sa"
    $port = "1444"
    $database = "hoppscotch"
    $username = "sa"
    $password = "IqUB6l6sA725"
    $serverInstance = "$server,$port"

    # Query to list all tables in the database
    $query = @"
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME
"@

    try {
        Write-Host "Connecting to SQL Server database..." -ForegroundColor Cyan
        $tables = Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -Username $username -Password $password -Query $query -TrustServerCertificate -ErrorAction Stop
        
        if ($tables.Count -eq 0) {
            Write-Host "No tables found in the database." -ForegroundColor Yellow
        } else {
            Write-Host "Tables in the database:" -ForegroundColor Cyan
            foreach ($table in $tables) {
                Write-Host "- $($table.TABLE_NAME)" -ForegroundColor Green
            }
            Write-Host "Total tables: $($tables.Count)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Error connecting to the database: $_" -ForegroundColor Red
    }
}

function Push-Schema {
    $flags = ""
    if ($Force) {
        $flags = "--force-reset"
    }
    if ($AcceptDataLoss) {
        $flags = "$flags --accept-data-loss"
    }

    Write-Host "Pushing schema to the database..." -ForegroundColor Cyan
    Invoke-Expression "npx prisma db push $flags"
}

function Reset-Database {
    Write-Host "Resetting the database..." -ForegroundColor Cyan
    if ($Force) {
        Invoke-Expression "npx prisma migrate reset --force"
    } else {
        Invoke-Expression "npx prisma migrate reset"
    }
}

function New-PrismaClient {
    Write-Host "Generating Prisma client..." -ForegroundColor Cyan
    Invoke-Expression "npx prisma generate"
}

function New-PrismaMigration {
    if ([string]::IsNullOrEmpty($MigrationName)) {
        Write-Host "Migration name is required for 'migrate' operation." -ForegroundColor Red
        exit 1
    }

    Write-Host "Creating migration: $MigrationName..." -ForegroundColor Cyan
    Invoke-Expression "npx prisma migrate dev --name $MigrationName"
}

# Main execution
switch ($Operation) {
    "check" {
        Get-DatabaseTables
    }
    "push" {
        Push-Schema
    }
    "reset" {
        Reset-Database
    }
    "generate" {
        New-PrismaClient
    }
    "migrate" {
        New-PrismaMigration
    }
    default {
        Write-Host "Invalid operation. Use one of: check, push, reset, generate, migrate" -ForegroundColor Red
    }
}

Write-Host "Operation completed." -ForegroundColor Cyan
