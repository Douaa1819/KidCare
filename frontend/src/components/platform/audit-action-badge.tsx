"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AUDIT_ACTIONS, auditActionKey, getAuditActionCategory, AUDIT_CATEGORY_STYLES } from "@/lib/platform-audit";

const KNOWN_ACTIONS = new Set(AUDIT_ACTIONS.map(auditActionKey));

const KNOWN_ENTITIES = new Set([
  "Utilisateur", "Organization", "Classe", "Event", "Menu",
  "FeatureFlag", "PlatformSettings", "RolePermission",
]);

export function AuditActionBadge({ action, className }: { action: string; className?: string }) {
  const t = useTranslations("platform.audit.actions");
  const key = auditActionKey(action);
  const label = KNOWN_ACTIONS.has(key) ? t(key) : t("unknown");
  const category = getAuditActionCategory(action);

  return (
    <Badge variant="outline" className={cn("font-medium text-xs", AUDIT_CATEGORY_STYLES[category], className)}>
      {label}
    </Badge>
  );
}

export function AuditEntityLabel({ entity }: { entity?: string | null }) {
  const t = useTranslations("platform.audit.entities");
  if (!entity) return <span className="text-gray-400">—</span>;
  const label = KNOWN_ENTITIES.has(entity) ? t(entity) : t("unknown");
  return <span>{label}</span>;
}
