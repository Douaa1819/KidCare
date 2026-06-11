/** Libellés traduits pour rôles, statuts et présences (évite le texte en dur). */

export type RoleKey = "SUPER_ADMIN" | "ADMIN" | "ENSEIGNANT" | "PARENT" | string;
export type UserStatusKey = "ACTIVE" | "DISABLED" | "ARCHIVED" | "INVITED" | "BLOCKED" | "PENDING" | string;
export type PresenceKey = "Present" | "Absent" | "Justifie" | "" | undefined;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

const ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  ENSEIGNANT: "teacher",
  PARENT: "parent",
};

const STATUS_MAP: Record<string, string> = {
  ACTIVE: "active",
  DISABLED: "disabled",
  ARCHIVED: "archived",
  INVITED: "invited",
  BLOCKED: "blocked",
  PENDING: "pending",
};

const PRESENCE_MAP: Record<string, string> = {
  Present: "present",
  Absent: "absent",
  Justifie: "justified",
};

export function roleLabel(role: RoleKey, t: TranslateFn): string {
  const key = ROLE_MAP[role];
  return key ? t(key) : role;
}

export function statusLabel(status: UserStatusKey, t: TranslateFn): string {
  const key = STATUS_MAP[String(status).toUpperCase()];
  return key ? t(key) : String(status);
}

export function presenceLabel(code: PresenceKey, t: TranslateFn): string {
  if (!code) return t("undefined");
  const key = PRESENCE_MAP[code];
  return key ? t(key) : t("undefined");
}
