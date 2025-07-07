# Check SQL Server database tables
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
    Write-Host "Connecting to SQL Server database..."
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
