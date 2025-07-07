-- This migration removes the ReqType table since it's not needed in the Prisma schema
-- The application uses TypeScript enums for ReqType instead of a database table

-- First check if the table exists
IF OBJECT_ID('ReqType', 'U') IS NOT NULL
BEGIN
    -- Simple drop - if there are FK constraints, we'll need to handle them separately
    DROP TABLE ReqType;
END
