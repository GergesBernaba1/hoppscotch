# Hoppscotch SQL Server Database Guide

This guide provides comprehensive instructions for managing the Hoppscotch backend with SQL Server.

## Current Status

The Hoppscotch backend has been successfully migrated from PostgreSQL to SQL Server with the following tables:
- ReqType
- Team
- TeamInvitation
- TeamMember
- TeamMemberRole
- User

Additional tables can be added as needed using the provided management script.

## Database Connection

The SQL Server connection string is configured in the `.env` file:

```
DATABASE_URL="sqlserver://db.expertapps.com.sa:1444;database=hoppscotch;user=sa;password=IqUB6l6sA725;trustServerCertificate=true;multipleActiveResultSets=true;applicationIntent=ReadWrite"
```

## Making Schema Changes

### Option 1: Direct Schema Updates

For simple changes, you can edit the `prisma/schema.prisma` file directly and apply changes using Prisma's `db push` command:

```powershell
# After modifying schema.prisma
npx prisma db push
```

### Option 2: Using Migrations (Recommended for Production)

For tracked changes that need to be versioned:

```powershell
# Create a migration
npx prisma migrate dev --name describe_your_changes

# Apply migrations to production
npx prisma migrate deploy
```

## Common Operations

### 1. Adding a New Model

Edit `schema.prisma` and add your model, then run:

```powershell
npx prisma db push
```

Example of adding a new model:

```prisma
model NewFeature {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdOn   DateTime @default(now())
  updatedOn   DateTime @updatedAt
}
```

### 2. Adding a Field to an Existing Model

Edit the model in `schema.prisma` and add your field, then run:

```powershell
npx prisma db push --accept-data-loss
```

Note: The `--accept-data-loss` flag is needed if you're adding a non-nullable field.

### 3. Creating Relationships Between Models

Example of adding a relationship:

```prisma
model Feature {
  id        String      @id @default(cuid())
  name      String
  settings  Setting[]
}

model Setting {
  id        String   @id @default(cuid())
  key       String
  value     String
  featureId String
  feature   Feature  @relation(fields: [featureId], references: [id])
}
```

### 4. Handling SQL Server-Specific Types

SQL Server has some type differences compared to PostgreSQL:

- Use `String @db.Text` for large text fields
- Use `String @db.NVarChar(MAX)` for variable-length Unicode strings
- Use `DateTime2` instead of TIMESTAMP
- Enums are implemented as string fields with constraints

## Troubleshooting

### Circular References

If you encounter circular reference errors:

1. Set `onUpdate: NoAction` and `onDelete: NoAction` on one side of the relation
2. Apply changes incrementally by adding models one at a time

Example fix:
```prisma
children UserCollection[] @relation("ParentUserCollection")
parent UserCollection? @relation("ParentUserCollection", fields: [parentID], references: [id], onDelete: NoAction, onUpdate: NoAction)
```

### Schema Validation Errors

If you get schema validation errors:

1. Try using `npx prisma validate` to identify issues
2. Ensure proper SQL Server types are used
3. Check for circular references in relationships

## Incremental Schema Application

For complex schemas with many interdependent models, you may need to apply changes incrementally. The included script `create-tables-incremental.ps1` demonstrates this approach.

## Generating Prisma Client

After schema changes, regenerate the Prisma client:

```powershell
npx prisma generate
```

## Viewing Database Tables

You can use the `check-database.ps1` script to view all tables in the database:

```powershell
.\check-database.ps1
```

## Backup and Restore

Always backup your database before making major changes:

```sql
-- In SQL Server Management Studio:
BACKUP DATABASE hoppscotch TO DISK = 'D:\backups\hoppscotch_backup.bak'
```

## Quick Start: Using the Management Script

Use the `manage-db.ps1` script for common database operations:

```powershell
# Check database tables
.\manage-db.ps1 -Operation check

# Push schema changes
.\manage-db.ps1 -Operation push

# Create a new migration
.\manage-db.ps1 -Operation migrate -MigrationName add_new_feature

# Generate Prisma client
.\manage-db.ps1 -Operation generate

# Reset database (caution: deletes data)
.\manage-db.ps1 -Operation reset -Force
```

## Adding New Models

To add a new model to your schema:

1. Edit the `prisma/schema.prisma` file and add your model:

```prisma
model ApiKey {
  id          String   @id @default(cuid())
  name        String
  key         String   @unique @default(uuid())
  userUid     String
  user        User     @relation(fields: [userUid], references: [uid], onDelete: Cascade)
  createdOn   DateTime @default(now())
  expiresOn   DateTime?
  
  @@index([userUid])
}
```

2. Update any related models to include the relation:

```prisma
model User {
  // existing fields
  apiKeys     ApiKey[]
  // other fields
}
```

3. Apply changes to the database:

```powershell
.\manage-db.ps1 -Operation push
```

4. Generate the updated Prisma client:

```powershell
.\manage-db.ps1 -Operation generate
```
