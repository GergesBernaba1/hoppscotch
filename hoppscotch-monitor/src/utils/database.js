/**
 * Database utilities for connecting to SQL Server and executing queries
 */
const sql = require('mssql');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const config = require('../config');

// Parse connection string
const parseDatabaseUrl = (connectionString) => {
  try {
    const url = new URL(connectionString.replace('sqlserver://', 'http://'));
    
    return {
      server: url.hostname,
      port: parseInt(url.port || '1433'),
      database: url.pathname.substring(1) || url.searchParams.get('database'),
      user: url.username,
      password: url.password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectionTimeout: config.database.connectionTimeout,
        requestTimeout: config.database.requestTimeout,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      }
    };
  } catch (error) {
    logger.error('Failed to parse database connection string', error);
    throw new Error('Invalid database connection string');
  }
};

// SQL Server connection pool
let pool = null;

// Prisma client instance
let prisma = null;

/**
 * Initialize the database connection
 */
const initialize = async () => {
  try {
    // Connect using SQL Server native client
    const sqlConfig = parseDatabaseUrl(config.database.url);
    pool = await sql.connect(sqlConfig);
    logger.info('Connected to SQL Server database');
    
    // Initialize Prisma client
    prisma = new PrismaClient();
    await prisma.$connect();
    logger.info('Prisma client connected');
    
    return { sql: pool, prisma };
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
};

/**
 * Close all database connections
 */
const close = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      logger.info('SQL Server connection closed');
    }
    
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
      logger.info('Prisma connection closed');
    }
  } catch (error) {
    logger.error('Error closing database connections', error);
  }
};

/**
 * Execute a SQL query directly using SQL Server client
 */
const executeQuery = async (query, params = []) => {
  try {
    if (!pool) {
      await initialize();
    }
    
    const request = pool.request();
    
    // Add parameters to the request
    params.forEach((param, index) => {
      request.input(`param${index}`, param);
    });
    
    const startTime = Date.now();
    const result = await request.query(query);
    const duration = Date.now() - startTime;
    
    return { 
      success: true, 
      data: result.recordset,
      rowCount: result.rowsAffected[0],
      duration
    };
  } catch (error) {
    logger.error('SQL query execution failed', { query, error: error.message });
    return { 
      success: false, 
      error: error.message,
      duration: 0
    };
  }
};

/**
 * Get SQL Server version
 */
const getDatabaseVersion = async () => {
  const result = await executeQuery('SELECT @@VERSION as version');
  return result.success ? result.data[0].version : 'Unknown';
};

/**
 * Check database connection status
 */
const checkConnection = async () => {
  try {
    const startTime = Date.now();
    const result = await executeQuery('SELECT 1 as test');
    const duration = Date.now() - startTime;
    
    return {
      success: result.success,
      duration,
      details: result.success ? 'Connection successful' : result.error
    };
  } catch (error) {
    logger.error('Database connection check failed', error);
    return {
      success: false,
      duration: 0,
      details: error.message
    };
  }
};

/**
 * Check database statistics
 */
const getDatabaseStats = async () => {
  try {
    const queries = [
      // Get database size
      `SELECT 
        DB_NAME() AS DatabaseName,
        CONVERT(DECIMAL(18,2), SUM(size) * 8 / 1024) AS DatabaseSizeMB
      FROM sys.database_files
      WHERE type = 0`,
      
      // Get top 5 largest tables
      `SELECT TOP 5
        t.NAME AS TableName,
        p.rows AS RowCounts,
        CONVERT(DECIMAL(18,2), SUM(a.total_pages) * 8 / 1024) AS TotalSpaceMB
      FROM sys.tables t
      INNER JOIN sys.indexes i ON t.OBJECT_ID = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0 AND i.OBJECT_ID > 255 
      GROUP BY t.Name, p.Rows
      ORDER BY TotalSpaceMB DESC`,
      
      // Get connection stats
      `SELECT 
        COUNT(*) AS ConnectionCount,
        COUNT(CASE WHEN status = 'running' THEN 1 END) AS ActiveConnections
      FROM sys.dm_exec_connections c
      JOIN sys.dm_exec_sessions s ON c.session_id = s.session_id`
    ];
    
    const results = await Promise.all(queries.map(query => executeQuery(query)));
    
    return {
      success: results.every(r => r.success),
      data: {
        databaseInfo: results[0].success ? results[0].data[0] : null,
        largestTables: results[1].success ? results[1].data : [],
        connectionStats: results[2].success ? results[2].data[0] : null
      }
    };
  } catch (error) {
    logger.error('Failed to get database statistics', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get Prisma client
 */
const getPrisma = async () => {
  if (!prisma) {
    prisma = new PrismaClient();
    await prisma.$connect();
  }
  return prisma;
};

module.exports = {
  initialize,
  close,
  executeQuery,
  checkConnection,
  getDatabaseVersion,
  getDatabaseStats,
  getPrisma
};
