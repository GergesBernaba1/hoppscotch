# Hoppscotch: PostgreSQL to SQL Server Migration Guide

This guide provides comprehensive instructions for migrating the Hoppscotch application database from PostgreSQL to Microsoft SQL Server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration Changes](#configuration-changes)
3. [Database Schema Migration](#database-schema-migration)
4. [Data Migration](#data-migration)
5. [Dependency Updates](#dependency-updates)
6. [Testing and Validation](#testing-and-validation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Post-Migration Tasks](#post-migration-tasks)

## Prerequisites

Before beginning the migration, ensure you have:

- SQL Server installed and accessible (2017 or later recommended)
- SQL Server Management Studio (SSMS) or Azure Data Studio
- SQL Server Migration Assistant (SSMA) for PostgreSQL
- Node.js and npm (latest LTS version)
- PowerShell 5.1 or later
- Access to both PostgreSQL and SQL Server databases with appropriate permissions
- A backup of your current PostgreSQL database

## Configuration Changes

### 1. Update Prisma Schema Provider

Modify the `prisma/schema.prisma` file to use SQL Server:

```prisma
datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

### 2. Create or Update Environment Variables

Create a `.env` file in the `hoppscotch-backend` directory with the SQL Server connection string:

```
DATABASE_URL="sqlserver://your-server:1433;database=hoppscotch;user=your-username;password=your-password;trustServerCertificate=true;multipleActiveResultSets=true;applicationIntent=ReadWrite"
```

### 3. Update Docker Compose Files (If Using Docker)

If using Docker, update the `docker-compose.yml` file to use SQL Server:

```yaml
services:
  hoppscotch-backend:
    environment:
      - DATABASE_URL=sqlserver://your-server:1433;database=hoppscotch;user=your-username;password=your-password;trustServerCertificate=true;multipleActiveResultSets=true
```

If you previously had a PostgreSQL container, you'll need to replace it with a SQL Server container or use an external SQL Server instance.

## Database Schema Migration

### Option 1: Using SQL Server Migration Assistant (SSMA)

1. **Install SSMA for PostgreSQL**
   - Download from: https://aka.ms/ssmaforazure

2. **Create a New Project in SSMA**
   - Project Type: PostgreSQL to SQL Server
   - Set the target SQL Server version

3. **Connect to Source PostgreSQL Database**
   - Configure connection to your PostgreSQL database

4. **Connect to Target SQL Server**
   - Configure connection to your SQL Server instance

5. **Convert Schema**
   - Right-click the PostgreSQL database and select "Convert Schema"
   - SSMA converts the PostgreSQL schema to SQL Server format

6. **Synchronize to SQL Server**
   - Right-click on the converted schema and select "Synchronize with Database"
   - This creates the tables, views, and other objects in SQL Server

7. **Migrate Data**
   - Right-click the PostgreSQL database and select "Migrate Data"
   - SSMA copies the data from PostgreSQL to SQL Server

### Option 2: Using Prisma Migration Tools

1. **Export the PostgreSQL Schema**
   ```powershell
   $env:DATABASE_URL="postgresql://username:password@localhost:5432/hoppscotch"
   npx prisma db pull
   ```

2. **Update the Schema for SQL Server**
   - Modify `schema.prisma` to use the SQL Server provider
   - Update any PostgreSQL-specific types to SQL Server compatible types

3. **Apply Schema to SQL Server**
   ```powershell
   $env:DATABASE_URL="sqlserver://username:password@localhost:1433;database=hoppscotch;trustServerCertificate=true"
   npx prisma db push
   ```

## Data Migration

### Option 1: Using SSMA (Recommended for Large Databases)

The SSMA data migration process handles the bulk transfer of data between PostgreSQL and SQL Server, automatically converting data types as needed.

### Option 2: Using Custom Scripts

For more control over the migration process, use the provided PowerShell script:

```powershell
.\migrate-postgres-to-sqlserver.ps1 `
  -PgHost localhost -PgPort 5432 -PgDatabase hoppscotch -PgUsername postgres -PgPassword pgpass `
  -SqlServerHost localhost -SqlServerPort 1433 -SqlServerDatabase hoppscotch -SqlServerUsername sa -SqlServerPassword sqlpass
```

This script:
1. Exports data from PostgreSQL tables
2. Converts the exported data to SQL Server format
3. Imports the data into SQL Server

### Option 3: Manual Migration

For smaller databases or specific tables:

1. Export data from PostgreSQL:
   ```sql
   COPY (SELECT * FROM your_table) TO 'C:\temp\your_table.csv' WITH CSV HEADER;
   ```

2. Import data into SQL Server:
   ```sql
   BULK INSERT your_table
   FROM 'C:\temp\your_table.csv'
   WITH (FORMAT = 'CSV', FIRSTROW = 2);
   ```

## Dependency Updates

1. **Install SQL Server Related Packages**
   ```powershell
   .\update-sqlserver-deps.ps1
   ```

   This script installs:
   - `mssql`: SQL Server client for Node.js
   - `@types/mssql`: TypeScript definitions for mssql
   - Updates `@prisma/client` and `prisma` packages

2. **Update Package.json Scripts**
   
   Ensure any database-specific scripts in `package.json` are updated:
   
   ```json
   {
     "scripts": {
       "migrate": "prisma migrate deploy",
       "db:push": "prisma db push",
       "prisma:generate": "prisma generate"
     }
   }
   ```

## Testing and Validation

Run the comprehensive test script to validate your migration:

```powershell
.\test-sqlserver-migration.ps1
```

This script performs:

1. **Database Connection Test**
   - Verifies the connection to SQL Server

2. **Schema Validation**
   - Checks if all required tables exist in the database

3. **CRUD Operations Test**
   - Tests Create, Read, Update, Delete operations against key tables
   - Ensures data integrity and constraint functionality

4. **Application Integration Test**
   - Starts the backend server
   - Tests API endpoints to verify application functionality

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Errors

**Issue**: Unable to connect to SQL Server
**Solution**:
- Verify the connection string format
- Check network connectivity
- Ensure SQL Server is configured to allow remote connections
- Check firewall settings

```powershell
# Test connection to SQL Server
node .\test-sql-server-connection.js
```

#### 2. Schema Conversion Issues

**Issue**: Data type mismatches or incompatible constructs
**Solution**:
- Review Prisma schema for PostgreSQL-specific types
- Update to SQL Server compatible types
- Handle JSON fields appropriately (use `nvarchar(max)`)

#### 3. SQL Server Authentication Issues

**Issue**: Login failed for user
**Solution**:
- Verify SQL Server authentication mode
- Check user credentials and permissions
- Ensure the database exists and user has access

#### 4. Performance Issues

**Issue**: Queries are slower in SQL Server
**Solution**:
- Review and optimize indexes
- Update statistics
- Check for missing primary keys or clustered indexes

## Best Practices

### 1. Backup Strategy

- Create a full backup of your PostgreSQL database before migration
- Take a backup of the SQL Server database after schema creation but before data migration
- Schedule regular backups of the SQL Server database after migration

### 2. Testing in Staging Environment

- Always perform the migration in a staging environment first
- Compare application behavior between PostgreSQL and SQL Server
- Measure performance and optimize as needed

### 3. Monitoring and Logging

- Implement monitoring for SQL Server performance
- Set up alerts for SQL Server errors or performance issues
- Maintain logs of database operations for troubleshooting

### 4. Gradual Rollout

- Consider a phased approach if possible
- Migrate non-critical data first
- Plan for a maintenance window for the final cutover

## Post-Migration Tasks

1. **Update Application Code**
   - Review and update any PostgreSQL-specific queries
   - Optimize queries for SQL Server performance

2. **Index Optimization**
   - Review existing indexes
   - Add new indexes based on query patterns
   - Monitor index usage and adjust as needed

3. **Database Maintenance**
   - Set up index maintenance tasks
   - Configure statistics updates
   - Plan for database growth

4. **Documentation Updates**
   - Update database schema documentation
   - Document the migration process
   - Update deployment guides

5. **User Training**
   - Train developers on SQL Server basics
   - Provide guidance on SQL Server Management Studio
   - Document differences between PostgreSQL and SQL Server

## Conclusion

By following this guide, you should be able to successfully migrate the Hoppscotch application from PostgreSQL to SQL Server while ensuring all components continue to function correctly. The migration process requires careful planning and thorough testing, but with the provided scripts and instructions, the transition should be smooth and efficient.
