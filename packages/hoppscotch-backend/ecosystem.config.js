module.exports = {
  apps: [{
    name: 'hoppscotch-backend',
    script: 'dist/main.js',
    cwd: 'D:/POCs/hoppscotch/packages/hoppscotch-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3170,
      
      // Database Configuration
      DATABASE_URL: 'postgresql://postgres:qrO4y935JTxd@45.241.60.20:5432/hoppscotch?schema=public',
      
      // Security Configuration
      JWT_SECRET: 'hoppscotch-secure-jwt-secret-key-2025',
      TOKEN_SALT_COMPLEXITY: 10,
      MAGIC_LINK_TOKEN_VALIDITY: 3,
      REFRESH_TOKEN_VALIDITY: '604800000', // 7 days
      ACCESS_TOKEN_VALIDITY: '86400000',   // 1 day
      SESSION_SECRET: 'hoppscotch-session-secret-key-2025',
      ALLOW_SECURE_COOKIES: false, // Set to true if using HTTPS
      
      // Data Encryption
      DATA_ENCRYPTION_KEY: 'hoppscotch-data-encryption-key-32',
      
      // Domain Configuration for your IIS deployment
      REDIRECT_URL: 'http://hoppscotch.expertapps.com.sa',
      WHITELISTED_ORIGINS: 'http://hoppscotch.expertapps.com.sa,http://localhost:3000',
      VITE_ALLOWED_AUTH_PROVIDERS: 'EMAIL',
      
      // Mailer Configuration (disabled for basic setup)
      MAILER_SMTP_ENABLE: 'false',
      MAILER_USE_CUSTOM_CONFIGS: 'false',
      MAILER_ADDRESS_FROM: '"Hoppscotch" <noreply@expertapps.com.sa>'
    },
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
}
