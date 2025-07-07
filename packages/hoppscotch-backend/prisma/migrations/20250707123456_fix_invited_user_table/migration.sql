-- This migration updates the InvitedUser table to match the Prisma schema
-- No need to rename as the table already exists with the correct name

-- Step 1: Check if id column exists and add if it doesn't
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'InvitedUser' AND COLUMN_NAME = 'id'
)
BEGIN
    -- Add id column
    ALTER TABLE "InvitedUser" ADD "id" NVARCHAR(255) NOT NULL DEFAULT NEWID();
    
    -- Set id as primary key (if not already)
    IF NOT EXISTS (
        SELECT * FROM sys.key_constraints 
        WHERE [type] = 'PK' AND [parent_object_id] = OBJECT_ID('InvitedUser')
    )
    BEGIN
        ALTER TABLE "InvitedUser" ADD CONSTRAINT "PK_InvitedUser" PRIMARY KEY ("id");
    END
END

-- Step 2: Add unique constraint if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.key_constraints 
    WHERE [type] = 'UQ' AND [parent_object_id] = OBJECT_ID('InvitedUser') 
    AND [name] = 'InvitedUser_adminUid_inviteeEmail_key'
)
BEGIN
    ALTER TABLE "InvitedUser" 
    ADD CONSTRAINT "InvitedUser_adminUid_inviteeEmail_key" 
    UNIQUE ("adminUid", "inviteeEmail");
END
