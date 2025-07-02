# 🚀 Hoppscotch Backend Deployment with PM2
## For: http://hoppscotch.expertapps.com.sa/

## Prerequisites

1. **Node.js 18+** installed on your Windows server
2. **PM2** installed globally:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```

3. **Database** (PostgreSQL recommended) - Your config is already set for:
   ```
   postgresql://postgres:qrO4y935JTxd@45.241.60.20:5432/hoppscotch
   ```

## Step 1: Copy Backend Files to Server

### Option A: Copy from Development Machine

```powershell
# Create backend directory on server
mkdir C:\hoppscotch\backend

# Copy the entire backend package (from your dev machine to server)
Copy-Item "D:\POCs\hoppscotch\packages\hoppscotch-backend\*" -Destination "C:\hoppscotch\backend\" -Recurse -Force
```

### Option B: Clone and Build on Server

```powershell
# On your server
cd C:\hoppscotch
git clone https://github.com/hoppscotch/hoppscotch.git
cd hoppscotch\packages\hoppscotch-backend
npm install
npm run build
```

## Step 2: Install Dependencies

```powershell
cd C:\hoppscotch\backend
npm install --production
```

## Step 3: Database Setup

If you haven't set up the database yet:

```powershell
# Install Prisma CLI
npm install -g prisma

# Run database migrations
cd C:\hoppscotch\backend
npx prisma migrate deploy
npx prisma generate
```

## Step 4: Start Backend with PM2

### Using the Provided ecosystem.config.js

```powershell
cd C:\hoppscotch\backend
pm2 start ecosystem.config.js
```

### Or Start Manually

```powershell
pm2 start dist/main.js --name "hoppscotch-backend" --env production
```

## Step 5: Configure PM2 for Windows Startup

```powershell
# Save current PM2 configuration
pm2 save

# Install PM2 startup script for Windows
pm2-startup install

# Set PM2 to start on Windows boot
pm2 startup
```

## Step 6: Verify Backend is Running

```powershell
# Check PM2 status
pm2 status

# Check backend health
curl http://localhost:3170/v1/infra/health

# View logs
pm2 logs hoppscotch-backend
```

## PM2 Management Commands

### Essential PM2 Commands

```powershell
# Start the service
pm2 start ecosystem.config.js

# Stop the service
pm2 stop hoppscotch-backend

# Restart the service
pm2 restart hoppscotch-backend

# Delete the service
pm2 delete hoppscotch-backend

# View logs
pm2 logs hoppscotch-backend

# Monitor in real-time
pm2 monit

# Save current config
pm2 save

# Reload configuration
pm2 reload ecosystem.config.js
```

### Useful Monitoring Commands

```powershell
# Show detailed info
pm2 show hoppscotch-backend

# Show logs with timestamp
pm2 logs hoppscotch-backend --timestamp

# Clear logs
pm2 flush hoppscotch-backend

# Monitor CPU/Memory usage
pm2 monit
```

## Configuration Details

Your `ecosystem.config.js` is configured for:

- **Port:** 3170
- **Domain:** http://hoppscotch.expertapps.com.sa
- **Database:** PostgreSQL on 45.241.60.20:5432
- **Logs:** `./logs/` directory

### Environment Variables Included:

```javascript
NODE_ENV: 'production'
PORT: 3170
DATABASE_URL: 'postgresql://postgres:qrO4y935JTxd@45.241.60.20:5432/hoppscotch?schema=public'
REDIRECT_URL: 'http://hoppscotch.expertapps.com.sa'
WHITELISTED_ORIGINS: 'http://hoppscotch.expertapps.com.sa,http://localhost:3000'
```

## Troubleshooting

### Common Issues

1. **Port 3170 already in use:**
   ```powershell
   netstat -ano | findstr :3170
   taskkill /PID <process_id> /F
   ```

2. **Database connection issues:**
   - Verify database server is accessible
   - Check firewall settings
   - Test connection: `psql -h 45.241.60.20 -U postgres -d hoppscotch`

3. **PM2 service not starting:**
   ```powershell
   # Check logs for errors
   pm2 logs hoppscotch-backend --lines 50
   
   # Restart with verbose logging
   pm2 restart hoppscotch-backend --log-type all
   ```

4. **Windows service not starting on boot:**
   ```powershell
   # Reinstall startup script
   pm2-startup uninstall
   pm2-startup install
   pm2 save
   ```

### Log Locations

- **PM2 logs:** `C:\Users\{username}\.pm2\logs\`
- **Application logs:** `C:\hoppscotch\backend\logs\`
- **Windows Event Viewer:** Application logs

## Security Considerations

1. **Firewall Rules:**
   ```powershell
   # Allow port 3170 only from localhost (recommended)
   netsh advfirewall firewall add rule name="Hoppscotch Backend" dir=in action=allow protocol=TCP localport=3170 remoteip=127.0.0.1
   ```

2. **User Permissions:**
   - Run PM2 under a service account
   - Limit file system permissions

3. **SSL/HTTPS:**
   - Consider configuring HTTPS for production
   - Update `ALLOW_SECURE_COOKIES: true` in config

## Health Check Endpoints

Test these URLs after deployment:

- **Health:** http://localhost:3170/v1/infra/health
- **GraphQL:** http://localhost:3170/graphql
- **Via IIS Proxy:** http://hoppscotch.expertapps.com.sa/api/v1/infra/health

## Complete Deployment Script

Here's a complete PowerShell script for backend deployment:
