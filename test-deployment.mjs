#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';

console.log('🧪 Testing manual deployment...');

const distPath = path.join(process.cwd(), 'packages', 'hoppscotch-selfhost-web', 'dist');

console.log('📁 Starting local HTTP server to test deployment...');
console.log(`📂 Serving files from: ${distPath}`);

try {
  // Start a simple HTTP server for testing
  console.log('🌐 Starting server on http://localhost:8080');
  console.log('📝 Instructions:');
  console.log('   1. Open http://localhost:8080 in your browser');
  console.log('   2. Check if the app loads correctly');
  console.log('   3. Look for any console errors');
  console.log('   4. Press Ctrl+C to stop the server');
  console.log('');
  
  execSync(`npx http-server "${distPath}" -p 8080 -o`, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Failed to start test server:', error.message);
  console.log('');
  console.log('💡 Alternative: You can manually test by:');
  console.log(`   1. cd "${distPath}"`);
  console.log('   2. npx http-server -p 8080');
  console.log('   3. Open http://localhost:8080 in your browser');
}
