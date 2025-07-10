-- CreateTable
CREATE TABLE "InfraConfig" (
    "id" NVARCHAR(255) NOT NULL,
    "name" NVARCHAR(255) NOT NULL,
    "value" NVARCHAR(MAX),
    "active" BIT NOT NULL DEFAULT 1,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "InfraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfraConfig_name_key" ON "InfraConfig"("name");
