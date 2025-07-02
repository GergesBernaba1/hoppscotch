# deploy-to-iis.ps1
param(
    [string]$SitePath = "C:\inetpub\wwwroot\hoppscotch"
)

Write-Host "🚀 Deploying Hoppscotch to IIS..." -ForegroundColor Green
Write-Host "🌐 Target: http://hoppscotch.expertapps.com.sa/" -ForegroundColor Cyan
Write-Host "📁 IIS Path: $SitePath" -ForegroundColor Yellow
Write-Host ""

# Generate deployment files
Write-Host "📦 Building deployment files..." -ForegroundColor Yellow
try {
    node deploy-manual.mjs
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Copy files to IIS
Write-Host "📁 Copying files to IIS site..." -ForegroundColor Yellow
try {
    if (Test-Path $SitePath) {
        Write-Host "   Cleaning existing files..." -ForegroundColor Gray
        Remove-Item "$SitePath\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Force -Path $SitePath | Out-Null
    
    $sourcePath = "packages\hoppscotch-selfhost-web\dist\*"
    Write-Host "   Copying from: $sourcePath" -ForegroundColor Gray
    Copy-Item $sourcePath -Destination $SitePath -Recurse -Force
    Write-Host "✅ Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ File copy failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create web.config
Write-Host "⚙️ Creating web.config for IIS..." -ForegroundColor Yellow
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <!-- Enable URL Rewrite for SPA routing -->
    <rewrite>
      <rules>
        <!-- Handle SPA routes - redirect to index.html for client-side routing -->
        <rule name="SPA Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(assets)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
        
        <!-- Proxy API requests to backend (running on port 3170) -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3170/{R:1}" />
        </rule>
      </rules>
    </rewrite>

    <!-- Static file caching for performance -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
      <!-- Add MIME types for modern web files -->
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
    </staticContent>

    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>

    <!-- Enable compression -->
    <httpCompression>
      <dynamicTypes>
        <add mimeType="application/json" enabled="true" />
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="text/css" enabled="true" />
        <add mimeType="text/html" enabled="true" />
      </dynamicTypes>
      <staticTypes>
        <add mimeType="application/javascript" enabled="true" />
        <add mimeType="text/css" enabled="true" />
      </staticTypes>
    </httpCompression>

    <!-- Default document -->
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
"@

try {
    $webConfig | Out-File -FilePath "$SitePath\web.config" -Encoding UTF8
    Write-Host "✅ web.config created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ web.config creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Ensure IIS URL Rewrite module is installed" -ForegroundColor White
Write-Host "2. Create/configure IIS site pointing to: $SitePath" -ForegroundColor White
Write-Host "3. Set binding to: http://hoppscotch.expertapps.com.sa/" -ForegroundColor White
Write-Host "4. Deploy and start the backend service (see IIS_DEPLOYMENT_GUIDE.md)" -ForegroundColor White
Write-Host "5. Test the application at: http://hoppscotch.expertapps.com.sa/" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Backend Setup:" -ForegroundColor Yellow
Write-Host "   cd packages\hoppscotch-backend" -ForegroundColor Gray
Write-Host "   npm install && npm run build" -ForegroundColor Gray
Write-Host "   # Then setup as Windows service (see guide)" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see: IIS_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
