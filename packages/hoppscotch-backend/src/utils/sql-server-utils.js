// SQL Server Connection Test Utility
const sql = require('mssql');

/**
 * Parses a SQL Server connection string in the format:
 * sqlserver://username:password@host:port;database=dbname;other=params
 */
function parseConnectionString(connectionString) {
  try {
    // Replace sqlserver:// with http:// to use URL parsing
    const url = new URL(connectionString.replace('sqlserver://', 'http://'));
    
    // Extract params from search and pathname
    const params = Object.fromEntries(url.searchParams);
    const database = params.database || url.pathname.substring(1);
    
    return {
      user: url.username,
      password: url.password,
      server: url.hostname,
      port: parseInt(url.port || '1433'),
      database: database,
      options: {
        encrypt: params.encrypt === 'true',
        trustServerCertificate: params.trustServerCertificate === 'true',
        enableArithAbort: true,
        multipleActiveResultSets: params.multipleActiveResultSets === 'true'
      }
    };
  } catch (err) {
    console.error('Error parsing connection string:', err);
    throw new Error('Invalid SQL Server connection string format');
  }
}

/**
 * Tests the SQL Server connection
 */
async function testConnection(connectionString) {
  try {
    const config = parseConnectionString(connectionString);
    
    console.log('Connecting to SQL Server with config:', {
      user: config.user,
      server: config.server,
      port: config.port,
      database: config.database
    });
    
    // Connect to database
    const pool = await sql.connect(config);
    console.log('Connected successfully to SQL Server!');
    
    // Test simple query
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('SQL Server Version:', result.recordset[0].version);
    
    // Test database connection
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`Found ${tablesResult.recordset.length} tables in database:`);
    tablesResult.recordset.forEach((table, index) => {
      console.log(`${index + 1}. ${table.TABLE_NAME}`);
    });
    
    // Close connection
    await sql.close();
    console.log('Connection closed.');
    
    return {
      success: true,
      tables: tablesResult.recordset.map(record => record.TABLE_NAME)
    };
  } catch (err) {
    console.error('SQL Server connection error:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// Export functions
module.exports = {
  parseConnectionString,
  testConnection
};

// If run directly from command line
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  testConnection(process.env.DATABASE_URL)
    .then(result => {
      console.log('Connection test result:', result.success ? 'SUCCESS' : 'FAILED');
      process.exit(result.success ? 0 : 1);
    });
}
