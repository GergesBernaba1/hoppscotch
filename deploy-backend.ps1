# Hoppscotch Backend Deployment Script for IIS
# Domain: http://hoppscotch.expertapps.com.sa/

param(
    [Parameter(Mandatory=$false)]
    [string]$BackendPath = "C:\hoppscotch\backend",
    
    [Parameter(Mandatory=$false)]
    [string]$SourcePath = "D:\POCs\hoppscotch\packages\hoppscotch-backend",
    
    [Parameter(Mandatory=$false)]
    [bool]$InstallDependencies = $true,
    
    [Parameter(Mandatory=$false)]
    [bool]$SetupStartup = $true
)

Write-Host "🚀 Deploying Hoppscotch Backend Service..." -ForegroundColor Green
Write-Host "🌐 Target Domain: http://hoppscotch.expertapps.com.sa/" -ForegroundColor Cyan
Write-Host "📁 Backend Path: $BackendPath" -ForegroundColor Yellow
Write-Host ""

# Check if PM2 is installed
Write-Host "🔍 Checking PM2 installation..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 is installed (version: $pm2Version)" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 is not installed. Installing PM2..." -ForegroundColor Red
    npm install -g pm2
    npm install -g pm2-windows-startup
    Write-Host "✅ PM2 installed successfully" -ForegroundColor Green
}

# Create backend directory
Write-Host "📁 Creating backend directory..." -ForegroundColor Yellow
if (!(Test-Path -Path $BackendPath)) {
    New-Item -ItemType Directory -Force -Path $BackendPath | Out-Null
    Write-Host "✅ Created directory: $BackendPath" -ForegroundColor Green
} else {
    Write-Host "✅ Directory already exists: $BackendPath" -ForegroundColor Green
}

# Copy backend files
Write-Host "📦 Copying backend files..." -ForegroundColor Yellow
try {
    Copy-Item "$SourcePath\*" -Destination $BackendPath -Recurse -Force
    Write-Host "✅ Backend files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to copy backend files: $_" -ForegroundColor Red
    exit 1
}

# Install dependencies
if ($InstallDependencies) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    Set-Location $BackendPath
    try {
        npm install --production
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install dependencies: $_" -ForegroundColor Red
        exit 1
    }
}

# Create logs directory
Write-Host "📋 Creating logs directory..." -ForegroundColor Yellow
$logsPath = Join-Path $BackendPath "logs"
if (!(Test-Path -Path $logsPath)) {
    New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
}

# Stop existing PM2 process if running
Write-Host "🛑 Stopping existing Hoppscotch backend..." -ForegroundColor Yellow
try {
    pm2 stop hoppscotch-backend 2>$null
    pm2 delete hoppscotch-backend 2>$null
    Write-Host "✅ Stopped existing backend service" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No existing backend service found" -ForegroundColor Blue
}

# Start backend with PM2
Write-Host "🚀 Starting Hoppscotch backend with PM2..." -ForegroundColor Yellow
Set-Location $BackendPath
try {
    pm2 start ecosystem.config.js
    Write-Host "✅ Backend service started successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start backend service: $_" -ForegroundColor Red
    Write-Host "🔍 Checking for ecosystem.config.js..." -ForegroundColor Yellow
    
    if (Test-Path "ecosystem.config.js") {
        Write-Host "✅ ecosystem.config.js found" -ForegroundColor Green
        Write-Host "📋 Content preview:" -ForegroundColor Yellow
        Get-Content "ecosystem.config.js" | Select-Object -First 10
    } else {
        Write-Host "❌ ecosystem.config.js not found" -ForegroundColor Red
        exit 1
    }
    exit 1
}

# Save PM2 configuration
Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Yellow
try {
    pm2 save
    Write-Host "✅ PM2 configuration saved" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning: Failed to save PM2 configuration" -ForegroundColor Yellow
}

# Setup Windows startup (optional)
if ($SetupStartup) {
    Write-Host "🔧 Setting up Windows startup..." -ForegroundColor Yellow
    try {
        pm2-startup install
        pm2 startup
        Write-Host "✅ Windows startup configured" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Warning: Failed to configure Windows startup" -ForegroundColor Yellow
    }
}

# Verify deployment
Write-Host "🔍 Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $status = pm2 list --no-color | Select-String "hoppscotch-backend"
    if ($status) {
        Write-Host "✅ Backend service is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend service not found in PM2 list" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not verify PM2 status" -ForegroundColor Yellow
}

# Test health endpoint
Write-Host "🏥 Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3170/v1/infra/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health endpoint responding correctly" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Health endpoint returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health endpoint not accessible: $_" -ForegroundColor Red
    Write-Host "🔍 This might be normal if the service is still starting up" -ForegroundColor Blue
}

Write-Host ""
Write-Host "🎉 Backend deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Backend Path: $BackendPath" -ForegroundColor White
Write-Host "  Service Name: hoppscotch-backend" -ForegroundColor White
Write-Host "  Port: 3170" -ForegroundColor White
Write-Host "  Domain: http://hoppscotch.expertapps.com.sa/" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "  View status: pm2 status" -ForegroundColor White
Write-Host "  View logs: pm2 logs hoppscotch-backend" -ForegroundColor White
Write-Host "  Restart: pm2 restart hoppscotch-backend" -ForegroundColor White
Write-Host "  Stop: pm2 stop hoppscotch-backend" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Test URLs:" -ForegroundColor Cyan
Write-Host "  Health: http://localhost:3170/v1/infra/health" -ForegroundColor White
Write-Host "  Via IIS: http://hoppscotch.expertapps.com.sa/api/v1/infra/health" -ForegroundColor White
Write-Host "  GraphQL: http://hoppscotch.expertapps.com.sa/api/graphql" -ForegroundColor White
