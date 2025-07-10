-- Drop default constraint for 'active' column
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = d.name
FROM sys.tables t
JOIN sys.default_constraints d ON d.parent_object_id = t.object_id
JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = d.parent_column_id
WHERE t.name = 'InfraConfig' AND c.name = 'active';
IF @constraintName IS NOT NULL
    EXEC('ALTER TABLE "InfraConfig" DROP CONSTRAINT ' + @constraintName);

-- AlterTable
ALTER TABLE "InfraConfig" DROP COLUMN "active";
ALTER TABLE "InfraConfig" ADD "lastSyncedEnvFileValue" NVARCHAR(MAX);
