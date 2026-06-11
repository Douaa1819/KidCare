-- AlterEnum
ALTER TYPE "RoleUtilisateur" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "StatutUtilisateur" ADD VALUE 'ARCHIVED';

-- AlterTable
ALTER TABLE "Classe" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "sessionRevokedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "general" JSONB NOT NULL DEFAULT '{}',
    "auth" JSONB NOT NULL DEFAULT '{}',
    "invitations" JSONB NOT NULL DEFAULT '{}',
    "parents" JSONB NOT NULL DEFAULT '{}',
    "teachers" JSONB NOT NULL DEFAULT '{}',
    "admins" JSONB NOT NULL DEFAULT '{}',
    "email" JSONB NOT NULL DEFAULT '{}',
    "maintenance" JSONB NOT NULL DEFAULT '{}',
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessRestriction" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "cannotLogin" BOOLEAN NOT NULL DEFAULT false,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "noPhotoUpload" BOOLEAN NOT NULL DEFAULT false,
    "noEventManagement" BOOLEAN NOT NULL DEFAULT false,
    "noPresenceManagement" BOOLEAN NOT NULL DEFAULT false,
    "noChildManagement" BOOLEAN NOT NULL DEFAULT false,
    "noSettingsAccess" BOOLEAN NOT NULL DEFAULT false,
    "noAdminManagement" BOOLEAN NOT NULL DEFAULT false,
    "noTeacherManagement" BOOLEAN NOT NULL DEFAULT false,
    "noParentManagement" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserAccessRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "resource" TEXT NOT NULL,
    "view" BOOLEAN NOT NULL DEFAULT false,
    "create" BOOLEAN NOT NULL DEFAULT false,
    "edit" BOOLEAN NOT NULL DEFAULT false,
    "delete" BOOLEAN NOT NULL DEFAULT false,
    "upload" BOOLEAN NOT NULL DEFAULT false,
    "export" BOOLEAN NOT NULL DEFAULT false,
    "archive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_archivedAt_idx" ON "Organization"("archivedAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_creeLe_idx" ON "AuditLog"("creeLe");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserAccessRestriction_utilisateurId_key" ON "UserAccessRestriction"("utilisateurId");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_resource_key" ON "RolePermission"("role", "resource");

-- CreateIndex
CREATE INDEX "LoginHistory_utilisateurId_idx" ON "LoginHistory"("utilisateurId");

-- CreateIndex
CREATE INDEX "LoginHistory_email_idx" ON "LoginHistory"("email");

-- CreateIndex
CREATE INDEX "LoginHistory_creeLe_idx" ON "LoginHistory"("creeLe");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_jti_key" ON "UserSession"("jti");

-- CreateIndex
CREATE INDEX "UserSession_utilisateurId_idx" ON "UserSession"("utilisateurId");

-- CreateIndex
CREATE INDEX "UserSession_revoked_idx" ON "UserSession"("revoked");

-- CreateIndex
CREATE INDEX "Utilisateur_archivedAt_idx" ON "Utilisateur"("archivedAt");

-- CreateIndex
CREATE INDEX "Utilisateur_deletedAt_idx" ON "Utilisateur"("deletedAt");

-- CreateIndex
CREATE INDEX "Utilisateur_organizationId_idx" ON "Utilisateur"("organizationId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessRestriction" ADD CONSTRAINT "UserAccessRestriction_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
