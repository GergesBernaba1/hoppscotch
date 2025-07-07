# Apply database fixes for InvitedUser structure and remove ReqType table
$server = "db.expertapps.com.sa"
$port = "1444"
$database = "hoppscotch"
$username = "sa"
$password = "IqUB6l6sA725"
$serverInstance = "$server,$port"

# Migration 1: Fix InvitedUser table structure
$migrationFile1 = "d:\POCs\hoppscotch\packages\hoppscotch-backend\prisma\migrations\20250707123456_fix_invited_user_table\migration.sql"
$migrationSQL1 = Get-Content -Path $migrationFile1 -Raw

Write-Host "Running migration 1: fix_invited_user_table..." -ForegroundColor Cyan

try {
    Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -Username $username -Password $password -Query $migrationSQL1 -TrustServerCertificate -ErrorAction Stop
    Write-Host "Migration 1 applied successfully!" -ForegroundColor Green
    
    # Update the _prisma_migrations table to record this migration
    $recordMigrationQuery1 = @"
    IF NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE id = '20250707123456_fix_invited_user_table')
    BEGIN
        INSERT INTO _prisma_migrations (id, checksum, started_at, finished_at, migration_name, logs, rolled_back_at, applied_steps_count)
        VALUES (
            '20250707123456_fix_invited_user_table',
            'ce35f30c0e66c57c6a1a14c82abcff48698fbcd9b85c01f7547ad3a950cb4266',
            GETDATE(),
            GETDATE(),
            '20250707123456_fix_invited_user_table',
            'Applied manually',
            NULL,
            1
        );
    END
"@
    
    Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -Username $username -Password $password -Query $recordMigrationQuery1 -TrustServerCertificate -ErrorAction Stop
    Write-Host "Migration 1 recorded in _prisma_migrations table." -ForegroundColor Green
    
} catch {
    Write-Host "Error applying migration 1: $_" -ForegroundColor Red
}

# Migration 2: Remove ReqType table
$migrationFile2 = "d:\POCs\hoppscotch\packages\hoppscotch-backend\prisma\migrations\20250707123457_remove_reqtype_table\migration.sql"
$migrationSQL2 = Get-Content -Path $migrationFile2 -Raw

Write-Host "Running migration 2: remove_reqtype_table..." -ForegroundColor Cyan

try {
    Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -Username $username -Password $password -Query $migrationSQL2 -TrustServerCertificate -ErrorAction Stop
    Write-Host "Migration 2 applied successfully!" -ForegroundColor Green
    
    # Update the _prisma_migrations table to record this migration
    $recordMigrationQuery2 = @"
    IF NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE id = '20250707123457_remove_reqtype_table')
    BEGIN
        INSERT INTO _prisma_migrations (id, checksum, started_at, finished_at, migration_name, logs, rolled_back_at, applied_steps_count)
        VALUES (
            '20250707123457_remove_reqtype_table',
            'f85dce30348fce5f6a4b3de3ce9ca3289967a5a4d5c253a86ac3f6ea2dd78a1c',
            GETDATE(),
            GETDATE(),
            '20250707123457_remove_reqtype_table',
            'Applied manually',
            NULL,
            1
        );
    END
"@
    
    Invoke-Sqlcmd -ServerInstance $serverInstance -Database $database -Username $username -Password $password -Query $recordMigrationQuery2 -TrustServerCertificate -ErrorAction Stop
    Write-Host "Migration 2 recorded in _prisma_migrations table." -ForegroundColor Green
    
} catch {
    Write-Host "Error applying migration 2: $_" -ForegroundColor Red
}
