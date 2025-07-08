// test-sql-server-connection.js
const sql = require('mssql');

// Parse the DATABASE_URL environment variable
const url = new URL(process.env.DATABASE_URL.replace('sqlserver://', 'http://'));
const dbConfig = {
  user: url.username,
  password: url.password,
  server: url.hostname,
  port: parseInt(url.port || '1433'),
  database: url.pathname.substring(1) || url.searchParams.get('database'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

console.log('Attempting to connect with config:', {
  user: dbConfig.user,
  server: dbConfig.server,
  port: dbConfig.port,
  database: dbConfig.database
});

async function testConnection() {
  try {
    // Connect to database
    await sql.connect(dbConfig);
    console.log('Connected successfully to SQL Server!');
    
    // Test query
    const result = await sql.query`SELECT 1 as test`;
    console.log('Query result:', result.recordset);
    
    // Close connection
    await sql.close();
    console.log('Connection closed.');
    
    return true;
  } catch (err) {
    console.error('SQL Server connection error:', err);
    return false;
  }
}

testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
