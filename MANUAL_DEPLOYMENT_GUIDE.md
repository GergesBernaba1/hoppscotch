# 🚀 Hoppscotch Manual Deployment Guide

## Problem You Were Facing
When manually deploying the static files from the `dist` folder, the app wasn't working because:
1. Environment variables weren't properly configured
2. The built files contained placeholders that needed to be processed
3. Backend URLs weren't pointing to the correct endpoints

## ✅ Solution
I've created a deployment script that fixes these issues by:
1. Building the production files
2. Processing environment variables 
3. Injecting the correct configuration into the static files

## 📋 Quick Start

### Step 1: Configure Your Environment
Edit `deployment.env` file and update the URLs to match your setup:

```bash
# For local testing (default)
VITE_BASE_URL="http://localhost:3000"
VITE_BACKEND_GQL_URL="http://localhost:3170/graphql"
VITE_BACKEND_WS_URL="ws://localhost:3170/graphql"
VITE_BACKEND_API_URL="http://localhost:3170/v1"

# For production deployment - replace with your actual domain
# VITE_BASE_URL="https://yourdomain.com"
# VITE_BACKEND_GQL_URL="https://yourdomain.com/api/graphql"
# VITE_BACKEND_WS_URL="wss://yourdomain.com/api/graphql"
# VITE_BACKEND_API_URL="https://yourdomain.com/api/v1"
```

### Step 2: Generate Deployment Files
```bash
node deploy-manual.mjs
```

### Step 3: Test Locally (Optional)
```bash
node test-deployment.mjs
```

### Step 4: Deploy
1. **Frontend**: Upload everything from `packages/hoppscotch-selfhost-web/dist/` to your web server
2. **Backend**: Deploy the backend separately (see backend deployment options below)

## 🗂️ What You Get

After running the deployment script, you'll find:

- **`packages/hoppscotch-selfhost-web/dist/`** - Complete static website ready for deployment
- **`DEPLOYMENT_INSTRUCTIONS.md`** - Detailed server configuration examples
- All environment variables properly injected into the files

## 🔧 Backend Deployment Options

### Option 1: Docker (Easiest)
```bash
docker build -f prod.Dockerfile --target backend -t hoppscotch-backend .
docker run -p 3170:8080 -e DATABASE_URL="your_db_url" hoppscotch-backend
```

### Option 2: Manual Node.js
```bash
cd packages/hoppscotch-backend
pnpm install
pnpm run build
pnpm run start:prod
```

## 🌐 Web Server Configuration

### Nginx Example
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist/folder;
    index index.html;
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:3170/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache with .htaccess
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 🔍 Troubleshooting

### App loads but shows connection errors?
- Check that your backend is running on the URL specified in your environment variables
- Verify CORS settings allow requests from your frontend domain
- Check browser console for specific error messages

### Blank page or JavaScript errors?
- Ensure your web server is configured for SPA (Single Page Application) routing
- Check that all static files are being served correctly
- Verify the base URL matches your deployment domain

### Environment variables not updating?
- Re-run `node deploy-manual.mjs` after changing `deployment.env`
- Clear browser cache and reload

## 📁 File Structure After Deployment

```
dist/
├── index.html              # Main app file (with injected env vars)
├── assets/                 # JavaScript, CSS, and other assets
├── icons/                  # App icons
├── images/                 # Static images
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service worker
└── DEPLOYMENT_INSTRUCTIONS.md
```

## 🎯 Key Benefits of This Approach

✅ **Environment variables properly configured**  
✅ **No more placeholder errors**  
✅ **Works with any static hosting service**  
✅ **Includes detailed deployment instructions**  
✅ **Production-optimized build**  
✅ **Easy to update configuration**

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your backend is accessible
3. Ensure your web server is configured for SPA routing
4. Review the generated `DEPLOYMENT_INSTRUCTIONS.md` file

---

*Generated on: ${new Date().toISOString()}*
