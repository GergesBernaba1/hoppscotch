#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Hoppscotch manual deployment process...');

// Step 1: Ensure we have a fresh build
console.log('📦 Building production assets...');
try {
  execSync('pnpm run generate', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 2: Process environment variables
console.log('⚙️  Processing environment variables...');

const deploymentEnvPath = path.join(process.cwd(), 'deployment.env');
const distPath = path.join(process.cwd(), 'packages', 'hoppscotch-selfhost-web', 'dist');

// Check if deployment.env exists
if (!fs.existsSync(deploymentEnvPath)) {
  console.error('❌ deployment.env file not found. Please create it first.');
  process.exit(1);
}

// Read environment variables from deployment.env
const envContent = fs.readFileSync(deploymentEnvPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"/, '').replace(/"$/, '');
      envVars[key] = value;
    }
  }
});

console.log(`📝 Found ${Object.keys(envVars).length} environment variables`);

// Step 3: Create the env file for import-meta-env
const envFileContent = Object.entries(envVars)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, value]) => `${key}="${value}"`)
  .join('\n');

const buildEnvPath = path.join(distPath, 'build.env');
fs.writeFileSync(buildEnvPath, envFileContent);
console.log('✅ Environment file created');

// Step 4: Process the built files with import-meta-env
console.log('🔄 Processing environment placeholders...');
try {
  execSync(`npx @import-meta-env/cli -x "${buildEnvPath}" -e "${buildEnvPath}" -p "${distPath}/**/*"`, { 
    stdio: 'inherit',
    cwd: distPath 
  });
  console.log('✅ Environment variables processed successfully');
} catch (error) {
  console.error('❌ Environment processing failed:', error.message);
  process.exit(1);
}

// Step 5: Clean up
fs.rmSync(buildEnvPath);

// Step 6: Create deployment instructions
const instructionsPath = path.join(distPath, 'DEPLOYMENT_INSTRUCTIONS.md');
const instructions = `# Hoppscotch Deployment Instructions

## Files in this directory
This directory contains the complete production build of Hoppscotch that can be deployed to any static web server.

## Backend Requirements
You still need to deploy the backend service separately. The backend should be running and accessible at the URL specified in your environment variables.

### Backend deployment options:
1. Use Docker: \`docker build -f prod.Dockerfile --target backend -t hoppscotch-backend .\`
2. Manual Node.js deployment: Build and run the backend from \`packages/hoppscotch-backend\`

## Web Server Configuration
Configure your web server to:
1. Serve static files from this directory
2. Handle client-side routing (SPA mode) - redirect all non-file requests to \`index.html\`
3. Set appropriate headers for assets caching

### Example Nginx configuration:
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/this/dist/folder;
    index index.html;
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

### Example Apache .htaccess:
\`\`\`apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
\`\`\`

## Environment Variables Used:
${Object.entries(envVars).map(([key, value]) => `- ${key}=${value}`).join('\n')}

## Verification
After deployment, check:
1. The app loads correctly at your domain
2. The backend connection works (check browser console for errors)
3. Authentication and API calls work properly

Generated on: ${new Date().toISOString()}
`;

fs.writeFileSync(instructionsPath, instructions);

console.log('🎉 Deployment preparation completed!');
console.log(`📁 Deployable files are in: ${distPath}`);
console.log(`📋 Check DEPLOYMENT_INSTRUCTIONS.md for server configuration details`);
console.log('');
console.log('Next steps:');
console.log('1. Deploy the backend service');
console.log('2. Upload the contents of the dist folder to your web server');
console.log('3. Configure your web server for SPA routing');
console.log('4. Update your environment variables if needed');
