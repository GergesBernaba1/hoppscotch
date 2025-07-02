# 🚀 Hoppscotch IIS Deployment Package
## For Domain: http://hoppscotch.expertapps.com.sa/

## ✅ Ready for Deployment

Your Hoppscotch deployment package is complete and ready for IIS deployment. All files have been built with the correct environment variables for your domain.

### 📦 What's Included

1. **Production Static Files** 
   - Location: `packages/hoppscotch-selfhost-web/dist/`
   - ✅ Environment variables injected for `http://hoppscotch.expertapps.com.sa/`
   - ✅ Optimized and minified for production

2. **IIS Configuration**
   - File: `web.config` 
   - ✅ SPA routing configured
   - ✅ API proxy rules for backend
   - ✅ Security headers and compression

3. **Backend Service Configuration**
   - File: `packages/hoppscotch-backend/ecosystem.config.js`
   - ✅ PM2 configuration ready
   - ✅ Environment variables for your domain

4. **Deployment Scripts**
   - `deploy-to-iis.ps1` - Automated IIS deployment
   - `deploy-manual.mjs` - Build and environment injection
   - ✅ Ready to use

5. **Documentation**
   - `IIS_DEPLOYMENT_GUIDE.md` - Complete deployment guide
   - `MANUAL_DEPLOYMENT_GUIDE.md` - Manual deployment steps

## 🔧 Quick Deployment Steps

### 1. Deploy Frontend to IIS

**Option A: Automated (Recommended)**
```powershell
# Run from the project root
.\deploy-to-iis.ps1 -SitePath "C:\inetpub\wwwroot\hoppscotch"
```

**Option B: Manual**
```powershell
# Copy static files
Copy-Item "packages\hoppscotch-selfhost-web\dist\*" -Destination "C:\inetpub\wwwroot\hoppscotch" -Recurse -Force

# Copy web.config
Copy-Item "web.config" -Destination "C:\inetpub\wwwroot\hoppscotch\web.config"
```

### 2. Configure IIS Site

1. Create new site in IIS Manager:
   - **Site name:** Hoppscotch
   - **Physical path:** `C:\inetpub\wwwroot\hoppscotch`
   - **Binding:** Port 80, Host name: `hoppscotch.expertapps.com.sa`

2. Ensure URL Rewrite module is installed

### 3. Deploy Backend Service

```powershell
# Copy backend files
Copy-Item "packages\hoppscotch-backend" -Destination "C:\hoppscotch\backend" -Recurse -Force

# Install dependencies
cd C:\hoppscotch\backend
npm install --production

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

### 4. Verify Deployment

- **Frontend:** http://hoppscotch.expertapps.com.sa/
- **Backend Health:** http://hoppscotch.expertapps.com.sa/api/v1/infra/health
- **GraphQL:** http://hoppscotch.expertapps.com.sa/api/graphql

## 🔍 Environment Configuration

Your deployment is configured with:

```bash
VITE_BASE_URL="http://hoppscotch.expertapps.com.sa"
VITE_BACKEND_API_URL="http://hoppscotch.expertapps.com.sa/api/v1"
VITE_BACKEND_GQL_URL="http://hoppscotch.expertapps.com.sa/api/graphql"
VITE_BACKEND_WS_URL="ws://hoppscotch.expertapps.com.sa/api/graphql"
```

## 🛠️ Prerequisites

Ensure your Windows server has:
- ✅ IIS with URL Rewrite module
- ✅ Node.js 18+ (for backend)
- ✅ PM2 installed globally (`npm install -g pm2`)
- ✅ PostgreSQL or SQL Server (for database features)

## 📋 Next Steps

1. **Deploy files to your server** using the provided scripts
2. **Configure DNS** to point `hoppscotch.expertapps.com.sa` to your server
3. **Test the deployment** with the verification URLs above
4. **Optional:** Configure SSL certificate for HTTPS

## 🔧 Troubleshooting

If you encounter issues:

1. **Check logs:**
   - IIS logs: `C:\inetpub\logs\LogFiles\W3SVC1\`
   - Backend logs: `pm2 logs hoppscotch-backend`

2. **Common fixes:**
   - Ensure URL Rewrite module is installed in IIS
   - Verify backend service is running on port 3170
   - Check firewall settings allow port 80/443

3. **Rebuild if needed:**
   ```powershell
   node deploy-manual.mjs
   ```

## 📞 Support

For detailed instructions, see:
- `IIS_DEPLOYMENT_GUIDE.md` - Complete IIS setup guide
- `MANUAL_DEPLOYMENT_GUIDE.md` - Manual deployment steps

---

**Your Hoppscotch deployment package is ready! 🎉**

All files are built with the correct configuration for `http://hoppscotch.expertapps.com.sa/`. Simply follow the deployment steps above to get your Hoppscotch instance running on IIS.
