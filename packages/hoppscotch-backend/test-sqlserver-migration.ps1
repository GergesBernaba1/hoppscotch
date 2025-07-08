# SQL Server Migration Test Suite

param (
    [Parameter(Mandatory = $false)]
    [switch]$Verbose = $false
)

# Set the database connection string - Update with your SQL Server details
$Env:DATABASE_URL = "sqlserver://your-server:1433;database=hoppscotch;user=your-username;password=your-password;trustServerCertificate=true;multipleActiveResultSets=true;applicationIntent=ReadWrite"

# Import SQL Server utilities
$ErrorActionPreference = "Stop"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Hoppscotch SQL Server Test Suite" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

function Test-DatabaseConnection {
    Write-Host "`n📋 Test: Database Connection" -ForegroundColor Yellow
    
    try {
        node ./test-sql-server-connection.js
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Database connection failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Database connection test error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-DatabaseSchema {
    Write-Host "`n📋 Test: Database Schema" -ForegroundColor Yellow
    
    try {
        # Connect to the database and check schema
        $result = node -e "const util = require('./src/utils/sql-server-utils'); util.testConnection(process.env.DATABASE_URL).then(result => { console.log(JSON.stringify(result)); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });"
        $testResult = $result | ConvertFrom-Json
        
        if (-not $testResult.success) {
            Write-Host "❌ Schema test failed: $($testResult.error)" -ForegroundColor Red
            return $false
        }
        
        $requiredTables = @(
            "User", 
            "Team", 
            "TeamMember", 
            "TeamCollection", 
            "TeamRequest", 
            "UserCollection", 
            "UserRequest",
            "UserEnvironment"
        )
        
        $missingTables = @()
        foreach ($table in $requiredTables) {
            if ($testResult.tables -notcontains $table) {
                $missingTables += $table
            }
        }
        
        if ($missingTables.Count -gt 0) {
            Write-Host "❌ Missing required tables: $($missingTables -join ', ')" -ForegroundColor Red
            return $false
        }
        
        Write-Host "✅ All required tables exist in the database" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Schema test error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-CrudOperations {
    Write-Host "`n📋 Test: CRUD Operations" -ForegroundColor Yellow
    
    try {
        # Create a temporary test script for CRUD operations
        $testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCRUD() {
  console.log('Starting CRUD tests...');
  
  try {
    // Test User operations
    console.log('Testing User CRUD operations...');
    
    // Create
    const testUser = await prisma.user.create({
      data: {
        displayName: 'Test User',
        email: 'test-sqlserver@example.com',
        isAdmin: false,
      },
    });
    console.log('Create user successful:', testUser.uid);
    
    // Read
    const foundUser = await prisma.user.findUnique({
      where: { uid: testUser.uid },
    });
    console.log('Read user successful:', foundUser.email);
    
    // Update
    const updatedUser = await prisma.user.update({
      where: { uid: testUser.uid },
      data: { displayName: 'Updated Test User' },
    });
    console.log('Update user successful:', updatedUser.displayName);
    
    // Test Team operations
    console.log('Testing Team CRUD operations...');
    
    // Create Team
    const testTeam = await prisma.team.create({
      data: {
        name: 'Test Team',
      },
    });
    console.log('Create team successful:', testTeam.id);
    
    // Create TeamMember
    const testMember = await prisma.teamMember.create({
      data: {
        role: 'OWNER',
        userUid: testUser.uid,
        teamID: testTeam.id,
      },
    });
    console.log('Create team member successful:', testMember.id);
    
    // Read Team with members
    const teamWithMembers = await prisma.team.findUnique({
      where: { id: testTeam.id },
      include: { members: true },
    });
    console.log('Read team with members successful:', teamWithMembers.members.length);
    
    // Clean up
    console.log('Cleaning up test data...');
    
    // Delete in correct order due to foreign key constraints
    await prisma.teamMember.delete({ where: { id: testMember.id } });
    await prisma.team.delete({ where: { id: testTeam.id } });
    await prisma.user.delete({ where: { uid: testUser.uid } });
    
    console.log('All CRUD tests passed successfully!');
    return { success: true };
  } catch (error) {
    console.error('CRUD test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

testCRUD()
  .then(result => {
    console.log('Test result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
"@
        
        $testScriptPath = ".\test-sqlserver-crud.js"
        $testScript | Out-File -FilePath $testScriptPath -Encoding utf8
        
        # Run CRUD test
        node $testScriptPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ CRUD operations successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ CRUD operations failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ CRUD test error: $_" -ForegroundColor Red
        return $false
    } finally {
        if (Test-Path $testScriptPath) {
            Remove-Item $testScriptPath -Force
        }
    }
}

function Test-AppFunctionality {
    Write-Host "`n📋 Test: Application Functionality" -ForegroundColor Yellow
    
    try {
        # Start the backend server in test mode
        Write-Host "Starting the backend server..." -ForegroundColor Cyan
        $serverProcess = Start-Process -FilePath "npm" -ArgumentList "run", "start:dev" -NoNewWindow -PassThru
        
        # Give the server time to start
        Start-Sleep -Seconds 15
        
        # Test API endpoints
        Write-Host "Testing API endpoints..." -ForegroundColor Cyan
        
        # Use curl to test the health endpoint (adjust if your app has a different endpoint)
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -ErrorAction Stop
        
        if ($response.status -eq "ok") {
            Write-Host "✅ API health check successful" -ForegroundColor Green
            $apiTestPassed = $true
        } else {
            Write-Host "❌ API health check failed" -ForegroundColor Red
            $apiTestPassed = $false
        }
        
        # Clean up
        if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
            Stop-Process -Id $serverProcess.Id -Force
        }
        
        return $apiTestPassed
    } catch {
        Write-Host "❌ Application functionality test error: $_" -ForegroundColor Red
        
        # Clean up in case of error
        $runningServer = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*start:dev*" }
        if ($null -ne $runningServer) {
            Stop-Process -Id $runningServer.Id -Force
        }
        
        return $false
    }
}

# Run tests
$connectionTestPassed = Test-DatabaseConnection
if (-not $connectionTestPassed) {
    Write-Host "`n❌ Database connection failed. Fix connection issues before continuing." -ForegroundColor Red
    exit 1
}

$schemaTestPassed = Test-DatabaseSchema
$crudTestPassed = Test-CrudOperations
$appTestPassed = Test-AppFunctionality

# Summary
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Database Connection: $(if ($connectionTestPassed) { "✅ PASSED" } else { "❌ FAILED" })" -ForegroundColor $(if ($connectionTestPassed) { "Green" } else { "Red" })
Write-Host "Database Schema: $(if ($schemaTestPassed) { "✅ PASSED" } else { "❌ FAILED" })" -ForegroundColor $(if ($schemaTestPassed) { "Green" } else { "Red" })
Write-Host "CRUD Operations: $(if ($crudTestPassed) { "✅ PASSED" } else { "❌ FAILED" })" -ForegroundColor $(if ($crudTestPassed) { "Green" } else { "Red" })
Write-Host "App Functionality: $(if ($appTestPassed) { "✅ PASSED" } else { "❌ FAILED" })" -ForegroundColor $(if ($appTestPassed) { "Green" } else { "Red" })
Write-Host "==================================" -ForegroundColor Cyan

if ($connectionTestPassed -and $schemaTestPassed -and $crudTestPassed -and $appTestPassed) {
    Write-Host "`n✅ All tests passed! The migration to SQL Server was successful." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Some tests failed. Review the issues before proceeding." -ForegroundColor Red
    exit 1
}
