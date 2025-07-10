-- CreateTable
CREATE TABLE "PersonalAccessToken" (
    "id" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "label" NVARCHAR(255) NOT NULL,
    "token" NVARCHAR(255) NOT NULL,
    "expiresOn" DATETIME2,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_token_key" ON "PersonalAccessToken"("token");

-- AddForeignKey
ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
