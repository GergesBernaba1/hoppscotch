# 🚀 Hoppscotch IIS Deployment Guide
## For: http://hoppscotch.expertapps.com.sa/

### 📋 Prerequisites
- Windows Server with IIS installed
- IIS URL Rewrite module installed
- Node.js installed (for backend)
- SQL Server or PostgreSQL for database

### 🔧 Step 1: Prepare Deployment Files

Run the deployment script to generate IIS-ready files:

```powershell
node deploy-manual.mjs
```

This will create deployment-ready files in: `packages\hoppscotch-selfhost-web\dist\`

### 🌐 Step 2: IIS Frontend Configuration

#### 2.1 Create IIS Site
1. Open **IIS Manager**
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name**: `Hoppscotch`
   - **Physical path**: `C:\inetpub\wwwroot\hoppscotch` (or your preferred path)
   - **Binding**: 
     - Type: HTTP
     - IP Address: All Unassigned
     - Port: 80
     - Host name: `hoppscotch.expertapps.com.sa`

#### 2.2 Copy Files
Copy all contents from `packages\hoppscotch-selfhost-web\dist\` to your IIS site folder:

```powershell
# Example PowerShell command
Copy-Item "D:\POCs\hoppscotch\packages\hoppscotch-selfhost-web\dist\*" -Destination "C:\inetpub\wwwroot\hoppscotch\" -Recurse -Force
```

#### 2.3 Create web.config for IIS

Create this `web.config` file in your IIS site root folder:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- Enable URL Rewrite for SPA routing -->
    <rewrite>
      <rules>
        <!-- Handle Angular/Vue.js routes -->
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
        
        <!-- Proxy API requests to backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3170/{R:1}" />
        </rule>
      </rules>
    </rewrite>

    <!-- Static file caching -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>

    <!-- MIME types for modern web files -->
    <staticContent>
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>

    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>

    <!-- Compression -->
    <httpCompression>
      <dynamicTypes>
        <add mimeType="application/json" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="text/css" enabled="true" />
        <add mimeType="text/html" enabled="true" />
      </dynamicTypes>
    </httpCompression>
  </system.webServer>
</configuration>
```

### 🔧 Step 3: Backend Deployment

#### Option A: Deploy Backend as Windows Service

1. **Build the backend**:
```powershell
cd packages\hoppscotch-backend
npm install
npm run build
```

2. **Install PM2 for Windows service**:
```powershell
npm install -g pm2
npm install -g pm2-windows-service
pm2-service-install
```

3. **Create ecosystem file** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'hoppscotch-backend',
    script: 'dist/main.js',
    cwd: 'D:/POCs/hoppscotch/packages/hoppscotch-backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3170,
      DATABASE_URL: 'postgresql://postgres:qrO4y935JTxd@45.241.60.20:5432/hoppscotch?schema=public',
      JWT_SECRET: 'hoppscotch-secure-jwt-secret-key-2025',
      REDIRECT_URL: 'http://hoppscotch.expertapps.com.sa',
      WHITELISTED_ORIGINS: 'http://hoppscotch.expertapps.com.sa',
      DATA_ENCRYPTION_KEY: 'hoppscotch-data-encryption-key-32-chars'
    }
  }]
}
```

4. **Start the service**:
```powershell
pm2 start ecosystem.config.js
pm2 save
```

#### Option B: IIS with iisnode (Alternative)

If you prefer running Node.js through IIS:

1. Install **iisnode** for IIS
2. Create a separate IIS application for the backend
3. Configure it to run on a different port or subdomain

### 🔧 Step 4: Database Configuration

Update your backend environment to point to your database. Edit the ecosystem.config.js or your environment variables:

```javascript
DATABASE_URL: 'postgresql://username:password@your-db-server:5432/hoppscotch'
// or for SQL Server:
// DATABASE_URL: 'sqlserver://server:port;database=hoppscotch;username=user;password=pass'
```

### 🔧 Step 5: Testing the Deployment

1. **Test frontend**: Visit `http://hoppscotch.expertapps.com.sa/`
2. **Test API**: Check `http://hoppscotch.expertapps.com.sa/api/health` (if available)
3. **Check logs**: Use PM2 logs or IIS logs for troubleshooting

### 🔍 Troubleshooting

#### Frontend Issues:
- **404 errors on refresh**: Ensure URL Rewrite module is installed and web.config is correct
- **Assets not loading**: Check MIME types and file permissions
- **CORS errors**: Verify backend WHITELISTED_ORIGINS includes your domain

#### Backend Issues:
- **Port conflicts**: Ensure port 3170 is available
- **Database connection**: Test database connectivity
- **Permissions**: Ensure IIS_IUSRS has read/execute permissions

### 📁 PowerShell Deployment Script

Create this PowerShell script for easy deployment:

```powershell
# deploy-to-iis.ps1
param(
    [string]$SitePath = "C:\inetpub\wwwroot\hoppscotch"
)

Write-Host "🚀 Deploying Hoppscotch to IIS..." -ForegroundColor Green

# Generate deployment files
Write-Host "📦 Building deployment files..." -ForegroundColor Yellow
node deploy-manual.mjs

# Copy files to IIS
Write-Host "📁 Copying files to IIS site..." -ForegroundColor Yellow
if (Test-Path $SitePath) {
    Remove-Item "$SitePath\*" -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $SitePath
Copy-Item "packages\hoppscotch-selfhost-web\dist\*" -Destination $SitePath -Recurse -Force

# Create web.config
Write-Host "⚙️ Creating web.config..." -ForegroundColor Yellow
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3170/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
  </system.webServer>
</configuration>
"@

$webConfig | Out-File -FilePath "$SitePath\web.config" -Encoding UTF8

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Visit: http://hoppscotch.expertapps.com.sa/" -ForegroundColor Cyan
Write-Host "📋 Next: Start the backend service and test the application" -ForegroundColor Yellow
```

### 🎯 Quick Deployment Commands

```powershell
# 1. Generate deployment files with your domain configuration
node deploy-manual.mjs

# 2. Run the PowerShell deployment script
.\deploy-to-iis.ps1

# 3. Start backend service
cd packages\hoppscotch-backend
pm2 start ecosystem.config.js
```

---

*Your Hoppscotch deployment is now configured for: **http://hoppscotch.expertapps.com.sa/***
