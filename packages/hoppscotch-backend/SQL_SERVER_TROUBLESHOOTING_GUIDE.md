# Hoppscotch SQL Server Troubleshooting Guide

This document addresses common issues that may arise during and after migrating from PostgreSQL to SQL Server, along with their solutions.

## Connection Issues

### Connection String Format

**Issue**: Incorrect connection string format
**Solution**:
```
DATABASE_URL="sqlserver://username:password@server:port;database=dbname;trustServerCertificate=true;multipleActiveResultSets=true"
```

Ensure:
- Username and password are URL encoded if they contain special characters
- Server name is correct (hostname or IP address)
- Port is specified (default is 1433)

### Network and Firewall

**Issue**: Cannot connect due to firewall or network restrictions
**Solution**:
- Check SQL Server is allowing TCP/IP connections
- Verify firewall allows connections on port 1433
- Test connectivity using:
  ```powershell
  Test-NetConnection -ComputerName your-server -Port 1433
  ```

### Authentication

**Issue**: Authentication failed
**Solution**:
- Verify SQL Server is in Mixed Authentication mode
- Ensure the user exists in SQL Server
- Check the user has appropriate permissions
- Try connecting with SQL Server Management Studio

## Schema Migration Issues

### Data Type Incompatibilities

**Issue**: PostgreSQL data types don't map cleanly to SQL Server
**Solutions**:

| PostgreSQL Type | SQL Server Type | Notes |
|----------------|----------------|-------|
| `text` | `nvarchar(max)` | For large text fields |
| `json/jsonb` | `nvarchar(max)` | Store as string and parse in application |
| `boolean` | `bit` | true=1, false=0 |
| `timestamp` | `datetime2` | Higher precision in SQL Server |
| `uuid` | `uniqueidentifier` | Different string format |
| `bytea` | `varbinary(max)` | For binary data |
| Arrays | Custom solution | Use JSON or separate tables |

### Circular References

**Issue**: Unable to create tables due to circular references
**Solution**:
- Use `onUpdate: NoAction` and `onDelete: NoAction` on one side of the relation
- Create tables without circular constraints first
- Add constraints after all tables are created

Example:
```prisma
model Parent {
  id       Int     @id @default(autoincrement())
  children Child[]
}

model Child {
  id       Int     @id @default(autoincrement())
  parentId Int
  parent   Parent  @relation(fields: [parentId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

### Identity/Sequence Issues

**Issue**: Auto-increment fields don't work or have wrong values
**Solution**:
- Use `@default(autoincrement())` in Prisma
- For existing data, set identity seed:
  ```sql
  DBCC CHECKIDENT ('your_table', RESEED, highest_existing_id)
  ```

## Data Migration Issues

### Character Encoding

**Issue**: Special characters appear corrupted
**Solution**:
- Use `nvarchar` instead of `varchar` for text fields
- Ensure your export/import process preserves UTF-8 encoding
- Use SQL Server collation that supports your language characters

### Date/Time Format

**Issue**: Dates are imported incorrectly
**Solution**:
- Standardize date format in exported data (ISO 8601: YYYY-MM-DD)
- Use explicit conversion in SQL Server:
  ```sql
  CONVERT(datetime2, '2023-07-08T14:30:00', 126)
  ```

### Batch Size Issues

**Issue**: Import fails with large data sets
**Solution**:
- Split import into smaller batches
- Increase SQL Server memory allocation
- Use bulk import utilities with appropriate batch size:
  ```sql
  BULK INSERT with ROWS_PER_BATCH option
  ```

## Application Integration Issues

### Query Syntax Differences

**Issue**: PostgreSQL-specific queries fail in SQL Server
**Common differences**:

1. **String Concatenation**
   - PostgreSQL: `'Hello' || ' World'`
   - SQL Server: `'Hello' + ' World'`

2. **Substring**
   - PostgreSQL: `substring(field from 1 for 3)`
   - SQL Server: `substring(field, 1, 3)`

3. **LIMIT/OFFSET**
   - PostgreSQL: `LIMIT 10 OFFSET 20`
   - SQL Server: `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`

4. **ILIKE (case insensitive search)**
   - PostgreSQL: `WHERE name ILIKE '%pattern%'`
   - SQL Server: `WHERE name LIKE '%pattern%' COLLATE SQL_Latin1_General_CP1_CI_AS`

5. **Return value from INSERT**
   - PostgreSQL: `INSERT INTO table (col) VALUES ('val') RETURNING id`
   - SQL Server: `INSERT INTO table (col) OUTPUT INSERTED.id VALUES ('val')`

6. **Boolean Values**
   - PostgreSQL: `WHERE is_active = true`
   - SQL Server: `WHERE is_active = 1`

### JSON Handling

**Issue**: JSON operations don't work in SQL Server
**Solution**:
- Use SQL Server 2016+ JSON functions
- Replace PostgreSQL JSONB operations with equivalent SQL Server syntax:

  **PostgreSQL:**
  ```sql
  SELECT data->>'name' FROM table WHERE data->>'age' = '30'
  ```

  **SQL Server:**
  ```sql
  SELECT JSON_VALUE(data, '$.name') FROM table WHERE JSON_VALUE(data, '$.age') = '30'
  ```

### Performance Issues

**Issue**: Queries are slower in SQL Server
**Solutions**:
1. **Update Statistics**
   ```sql
   UPDATE STATISTICS table_name WITH FULLSCAN
   ```

2. **Add Missing Indexes**
   - Use SQL Server Query Store to identify missing indexes
   - Add indexes based on commonly used queries

3. **Review Query Plans**
   - Use SQL Server Management Studio to analyze execution plans
   - Look for table scans and optimize for index seeks

4. **Memory Configuration**
   - Allocate sufficient memory to SQL Server
   - Set appropriate max server memory settings

## ORM-Specific Issues

### Prisma Issues

**Issue**: Prisma fails to connect or execute queries
**Solutions**:
1. Regenerate Prisma client after schema changes:
   ```
   npx prisma generate
   ```

2. Update Prisma dependencies:
   ```
   npm update @prisma/client prisma
   ```

3. Verify Prisma supports the SQL Server version

4. Check for Prisma preview features that might be required:
   ```prisma
   generator client {
     provider        = "prisma-client-js"
     previewFeatures = ["microsoftSqlServer"]
   }
   ```

## Common Runtime Errors

### Connection Pool Exhaustion

**Issue**: Too many connections error
**Solution**:
- Implement connection pooling
- Properly close connections after use
- Set reasonable pool size and timeout:

```javascript
// In your database connection setup
const pool = new sql.ConnectionPool({
  ...config,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
});
```

### Deadlocks

**Issue**: Transactions are deadlocking
**Solutions**:
- Ensure consistent access order for tables
- Keep transactions short
- Use appropriate isolation levels
- Monitor with:
  ```sql
  SELECT * FROM sys.dm_tran_locks WHERE request_session_id = @@SPID
  ```

### Memory Pressure

**Issue**: SQL Server uses too much memory
**Solution**:
- Configure max server memory setting
- Monitor with:
  ```sql
  SELECT 
      (physical_memory_in_use_kb/1024) AS Memory_used_by_SQL_MB,
      (locked_page_allocations_kb/1024) AS Locked_pages_used_by_SQL_MB
  FROM sys.dm_os_process_memory
  ```

## Post-Migration Monitoring

### Key Metrics to Monitor

1. **Query Performance**
   ```sql
   SELECT TOP 10 
       total_worker_time/execution_count AS Avg_CPU_Time,
       total_elapsed_time/execution_count AS Avg_Elapsed_Time,
       execution_count,
       plan_handle,
       query_plan
   FROM sys.dm_exec_query_stats
   CROSS APPLY sys.dm_exec_query_plan(plan_handle)
   ORDER BY total_worker_time DESC
   ```

2. **Index Usage**
   ```sql
   SELECT 
       o.name AS TableName,
       i.name AS IndexName,
       i.type_desc,
       s.user_seeks,
       s.user_scans,
       s.user_lookups,
       s.user_updates
   FROM sys.dm_db_index_usage_stats s
   JOIN sys.indexes i ON s.object_id = i.object_id AND s.index_id = i.index_id
   JOIN sys.objects o ON i.object_id = o.object_id
   WHERE s.database_id = DB_ID() AND o.type = 'U'
   ORDER BY s.user_seeks + s.user_scans + s.user_lookups DESC
   ```

3. **Error Log**
   ```sql
   EXEC sp_readerrorlog
   ```

## Resources

- [SQL Server Documentation](https://docs.microsoft.com/en-us/sql/sql-server)
- [Prisma SQL Server Documentation](https://www.prisma.io/docs/concepts/database-connectors/microsoft-sql-server)
- [SQL Server Migration Assistant](https://docs.microsoft.com/en-us/sql/ssma/sql-server-migration-assistant)
- [SQL Server Management Studio](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
