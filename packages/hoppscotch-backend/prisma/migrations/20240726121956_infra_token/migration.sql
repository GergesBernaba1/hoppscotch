-- CreateTable
CREATE TABLE "InfraToken" (
    "id" NVARCHAR(255) NOT NULL,
    "creatorUid" NVARCHAR(255) NOT NULL,
    "label" NVARCHAR(255) NOT NULL,
    "token" NVARCHAR(255) NOT NULL,
    "expiresOn" DATETIME2,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT "InfraToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InfraToken_token_key" ON "InfraToken"("token");
