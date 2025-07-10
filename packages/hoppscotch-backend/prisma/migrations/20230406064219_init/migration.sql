-- CreateEnum
-- CREATE TYPE "ReqType" AS ENUM ('REST', 'GQL');

-- CREATE TYPE "TeamMemberRole" AS ENUM ('OWNER', 'VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "Team" (
    "id" NVARCHAR(255) NOT NULL,
    "name" NVARCHAR(255) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" NVARCHAR(255) NOT NULL,
    "role" NVARCHAR(50) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "teamID" NVARCHAR(255) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" NVARCHAR(255) NOT NULL,
    "teamID" NVARCHAR(255) NOT NULL,
    "creatorUid" NVARCHAR(255) NOT NULL,
    "inviteeEmail" NVARCHAR(255) NOT NULL,
    "inviteeRole" NVARCHAR(50) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCollection" (
    "id" NVARCHAR(255) NOT NULL,
    "parentID" NVARCHAR(255),
    "teamID" NVARCHAR(255) NOT NULL,
    "title" NVARCHAR(255) NOT NULL,
    "orderIndex" INT NOT NULL,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "TeamCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRequest" (
    "id" NVARCHAR(255) NOT NULL,
    "collectionID" NVARCHAR(255) NOT NULL,
    "teamID" NVARCHAR(255) NOT NULL,
    "title" NVARCHAR(255) NOT NULL,
    "request" NVARCHAR(MAX) NOT NULL,
    "orderIndex" INT NOT NULL,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "TeamRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shortcode" (
    "id" NVARCHAR(255) NOT NULL,
    "request" NVARCHAR(MAX) NOT NULL,
    "creatorUid" NVARCHAR(255),
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT "Shortcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEnvironment" (
    "id" NVARCHAR(255) NOT NULL,
    "teamID" NVARCHAR(255) NOT NULL,
    "name" NVARCHAR(255) NOT NULL,
    "variables" NVARCHAR(MAX) NOT NULL,

    CONSTRAINT "TeamEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "uid" NVARCHAR(255) NOT NULL,
    "displayName" NVARCHAR(255),
    "email" NVARCHAR(255),
    "photoURL" NVARCHAR(255),
    "isAdmin" BIT NOT NULL DEFAULT 0,
    "refreshToken" NVARCHAR(255),
    "currentRESTSession" NVARCHAR(MAX),
    "currentGQLSession" NVARCHAR(MAX),
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT "User_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" NVARCHAR(255) NOT NULL,
    "userId" NVARCHAR(255) NOT NULL,
    "provider" NVARCHAR(255) NOT NULL,
    "providerAccountId" NVARCHAR(255) NOT NULL,
    "providerRefreshToken" NVARCHAR(255),
    "providerAccessToken" NVARCHAR(255),
    "providerScope" NVARCHAR(255),
    "loggedIn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "deviceIdentifier" NVARCHAR(255) NOT NULL,
    "token" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "expiresOn" DATETIME2 NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "properties" NVARCHAR(MAX) NOT NULL,
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHistory" (
    "id" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "reqType" NVARCHAR(50) NOT NULL,
    "request" NVARCHAR(MAX) NOT NULL,
    "responseMetadata" NVARCHAR(MAX) NOT NULL,
    "isStarred" BIT NOT NULL,
    "executedOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEnvironment" (
    "id" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "name" NVARCHAR(255),
    "variables" NVARCHAR(MAX) NOT NULL,
    "isGlobal" BIT NOT NULL,

    CONSTRAINT "UserEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitedUsers" (
    "adminUid" NVARCHAR(255) NOT NULL,
    "adminEmail" NVARCHAR(255) NOT NULL,
    "inviteeEmail" NVARCHAR(255) NOT NULL,
    "invitedOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- CreateTable
CREATE TABLE "UserRequest" (
    "id" NVARCHAR(255) NOT NULL,
    "collectionID" NVARCHAR(255) NOT NULL,
    "userUid" NVARCHAR(255) NOT NULL,
    "title" NVARCHAR(255) NOT NULL,
    "request" NVARCHAR(MAX) NOT NULL,
    "type" NVARCHAR(50) NOT NULL,
    "orderIndex" INT NOT NULL,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "UserRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" NVARCHAR(255) NOT NULL,
    "parentID" NVARCHAR(255),
    "userUid" NVARCHAR(255) NOT NULL,
    "title" NVARCHAR(255) NOT NULL,
    "orderIndex" INT NOT NULL,
    "type" NVARCHAR(50) NOT NULL,
    "createdOn" DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    "updatedOn" DATETIME2 NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamID_userUid_key" ON "TeamMember"("teamID", "userUid");

-- CreateIndex
CREATE INDEX "TeamInvitation_teamID_idx" ON "TeamInvitation"("teamID");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_teamID_inviteeEmail_key" ON "TeamInvitation"("teamID", "inviteeEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Shortcode_id_creatorUid_key" ON "Shortcode"("id", "creatorUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_deviceIdentifier_token_key" ON "VerificationToken"("deviceIdentifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userUid_key" ON "UserSettings"("userUid");

-- CreateIndex
CREATE UNIQUE INDEX "InvitedUsers_inviteeEmail_key" ON "InvitedUsers"("inviteeEmail");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamCollection" ADD CONSTRAINT "TeamCollection_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "TeamCollection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "TeamCollection" ADD CONSTRAINT "TeamCollection_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamRequest" ADD CONSTRAINT "TeamRequest_collectionID_fkey" FOREIGN KEY ("collectionID") REFERENCES "TeamCollection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "TeamRequest" ADD CONSTRAINT "TeamRequest_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "TeamEnvironment" ADD CONSTRAINT "TeamEnvironment_teamID_fkey" FOREIGN KEY ("teamID") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserHistory" ADD CONSTRAINT "UserHistory_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEnvironment" ADD CONSTRAINT "UserEnvironment_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvitedUsers" ADD CONSTRAINT "InvitedUsers_adminUid_fkey" FOREIGN KEY ("adminUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_collectionID_fkey" FOREIGN KEY ("collectionID") REFERENCES "UserCollection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_parentID_fkey" FOREIGN KEY ("parentID") REFERENCES "UserCollection"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_userUid_fkey" FOREIGN KEY ("userUid") REFERENCES "User"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
