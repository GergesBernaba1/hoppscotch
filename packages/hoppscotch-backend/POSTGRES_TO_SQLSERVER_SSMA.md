# PostgreSQL to SQL Server Migration with SSMA

This document provides step-by-step instructions for migrating the Hoppscotch database from PostgreSQL to SQL Server using SQL Server Migration Assistant (SSMA).

## Prerequisites

1. SQL Server Migration Assistant for PostgreSQL installed
   - Download from: https://aka.ms/ssmaforazure
2. SQL Server instance with credentials
3. PostgreSQL instance with the Hoppscotch database
4. Necessary permissions on both databases

## Migration Steps

### 1. Create the Target SQL Server Database

```sql
-- Connect to your SQL Server instance and run:
CREATE DATABASE hoppscotch;
```

### 2. Launch SQL Server Migration Assistant (SSMA) for PostgreSQL

1. Open SSMA for PostgreSQL
2. Click "New Project" and create a new project with:
   - Name: HoppscotchMigration
   - Location: Choose a folder to save the project
   - Migration To: Select your SQL Server version
   - Click "OK"

### 3. Connect to PostgreSQL

1. In the left pane, right-click "PostgreSQL Metadata" and select "Connect to PostgreSQL"
2. Enter your PostgreSQL connection details:
   - Server name: Your PostgreSQL server address
   - Server port: PostgreSQL port (default: 5432)
   - Username: PostgreSQL username
   - Password: PostgreSQL password
   - Database: hoppscotch (or your database name)
   - Click "Connect"

### 4. Connect to SQL Server

1. In the right pane, right-click "SQL Server Metadata" and select "Connect to SQL Server"
2. Enter your SQL Server connection details:
   - Server name: Your SQL Server address
   - Authentication: Choose authentication method
   - Username: SQL Server username
   - Password: SQL Server password
   - Database: hoppscotch
   - Click "Connect"

### 5. Map PostgreSQL to SQL Server

1. In the left pane, expand "PostgreSQL Metadata" and "Databases"
2. Right-click on the PostgreSQL database and select "Create Report" to review potential migration issues
3. Review the report and address any issues
4. Right-click on the PostgreSQL database and select "Convert Schema"
5. SSMA converts the PostgreSQL schema to SQL Server format

### 6. Apply Schema to SQL Server

1. In the left pane, right-click on the PostgreSQL database and select "Synchronize with Database"
2. Review the changes and click "Synchronize"
3. SSMA creates the schema objects in SQL Server

### 7. Migrate Data

1. In the left pane, right-click on the PostgreSQL database and select "Migrate Data"
2. Select the tables to migrate and click "Migrate"
3. SSMA transfers the data from PostgreSQL to SQL Server

### 8. Verify Migration

1. In SQL Server Management Studio, connect to your SQL Server instance
2. Verify that all tables, views, and other objects were created correctly
3. Verify that the data was migrated correctly
4. Run test queries to ensure functionality

### 9. Update Hoppscotch Configuration

1. Update the `.env` file in the Hoppscotch backend to use the SQL Server connection string
2. Update any application code that might have PostgreSQL-specific SQL

## Troubleshooting Common Issues

### Data Type Conversions

- **Text Fields**: PostgreSQL `text` fields are mapped to SQL Server `nvarchar(max)`
- **JSON Fields**: Convert PostgreSQL `json/jsonb` to SQL Server `nvarchar(max)`
- **Arrays**: PostgreSQL arrays need custom handling in SQL Server
- **Boolean Values**: PostgreSQL `boolean` maps to SQL Server `bit`

### Identity/Sequence Issues

- SQL Server uses IDENTITY for auto-incrementing keys, while PostgreSQL uses SERIAL or sequences
- Adjust sequence values after migration if needed

### Constraint Naming Differences

- SQL Server has different rules for constraint names
- SSMA should handle this, but check for constraint errors

### Case Sensitivity

- PostgreSQL is case-sensitive by default, SQL Server depends on collation settings
- Review queries with case-sensitive operations

## Post-Migration Tasks

1. Update indexes for better SQL Server performance
2. Set up SQL Server maintenance plans
3. Configure backups
4. Update connection strings in all application components
5. Update any PostgreSQL-specific code or queries
