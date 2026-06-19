/** Clés d'actions connues dans les journaux d'audit. */
export const AUDIT_ACTIONS = [
  "login.failed",
  "login.success",
  "admin.created",
  "user.updated",
  "user.status.invited",
  "user.status.active",
  "user.status.disabled",
  "user.status.archived",
  "user.restored",
  "user.soft_deleted",
  "user.force_logout",
  "password.reset",
  "permissions.updated",
  "role_permission.updated",
  "platform_settings.updated",
  "feature_flag.updated",
  "organization.created",
  "organization.updated",
  "organization.archived",
  "organization.restored",
  "class.archived",
  "class.restored",
  "event.archived",
  "event.restored",
  "menu.archived",
  "menu.restored",
] as const;

export type AuditActionCategory = "auth" | "user" | "security" | "settings" | "entity" | "other";

export function auditActionKey(action: string): string {
  return action.replace(/\./g, "_");
}

export function entityKey(entity: string | null | undefined): string {
  if (!entity) return "unknown";
  return entity.replace(/\s+/g, "");
}

export function getAuditActionCategory(action: string): AuditActionCategory {
  if (action.startsWith("login.")) return "auth";
  if (action.startsWith("user.") || action === "admin.created") return "user";
  if (action === "password.reset" || action === "user.force_logout") return "security";
  if (
    action.includes("settings") ||
    action.includes("feature_flag") ||
    action.includes("permission")
  ) {
    return "settings";
  }
  if (
    action.startsWith("class.") ||
    action.startsWith("event.") ||
    action.startsWith("menu.") ||
    action.startsWith("organization.")
  ) {
    return "entity";
  }
  return "other";
}

export const AUDIT_CATEGORY_STYLES: Record<AuditActionCategory, string> = {
  auth: "bg-blue-50 text-blue-700 border-blue-200",
  user: "bg-violet-50 text-violet-700 border-violet-200",
  security: "bg-orange-50 text-orange-700 border-orange-200",
  settings: "bg-slate-100 text-slate-700 border-slate-200",
  entity: "pp-surface-success border",
  other: "bg-gray-50 text-gray-600 border-gray-200",
};
