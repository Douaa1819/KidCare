"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RESOURCES = ["users", "children", "classes", "events", "menus", "photos", "reports", "settings", "admins"] as const;
const FLAGS = ["view", "create", "edit", "delete", "upload", "export", "archive"] as const;
const ROLES = ["SUPER_ADMIN", "ADMIN", "ENSEIGNANT", "PARENT"] as const;

type Matrix = Record<string, Record<string, Record<string, boolean>>>;

type Props = {
  matrix: Matrix;
  editable?: boolean;
  editableRoles?: string[];
  visibleRoles?: readonly string[];
  onToggle?: (role: string, resource: string, flag: string, value: boolean) => void;
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
  ENSEIGNANT: "bg-blue-100 text-blue-800 border-blue-200",
  PARENT: "bg-green-100 text-green-800 border-green-200",
};

export function PermissionMatrix({
  matrix,
  editable = false,
  editableRoles = ["ADMIN", "ENSEIGNANT", "PARENT"],
  visibleRoles,
  onToggle,
}: Props) {
  const t = useTranslations("platform.permissions");
  const rolesToShow = visibleRoles ?? ROLES;

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: t("roles.superAdmin"),
      ADMIN: t("roles.admin"),
      ENSEIGNANT: t("roles.teacher"),
      PARENT: t("roles.parent"),
    };
    return map[role] ?? role;
  };

  return (
    <div className="space-y-6">
      {rolesToShow.map((role) => (
        <Card key={role} className="p-4 overflow-x-auto border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className={ROLE_COLORS[role]}>{roleLabel(role)}</Badge>
            {role === "SUPER_ADMIN" && (
              <span className="text-xs text-gray-400">{t("readOnlyRole")}</span>
            )}
          </div>
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b text-start text-gray-500">
                <th className="py-2 pe-4 font-medium">{t("resource")}</th>
                {FLAGS.map((f) => (
                  <th key={f} className="py-2 px-2 font-medium text-center">
                    {t(f)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource} className="border-b border-gray-50 hover:bg-violet-50/20">
                  <td className="py-2 pe-4 font-medium text-gray-800">{t(resource)}</td>
                  {FLAGS.map((flag) => {
                    const checked = matrix[role]?.[resource]?.[flag] ?? false;
                    const canEdit = editable && editableRoles.includes(role) && role !== "SUPER_ADMIN";
                    return (
                      <td key={flag} className="py-2 px-2 text-center">
                        {canEdit ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => onToggle?.(role, resource, flag, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            aria-label={`${roleLabel(role)} — ${t(resource)} — ${t(flag)}`}
                          />
                        ) : (
                          <span className={checked ? "text-emerald-600 font-medium" : "text-gray-300"}>
                            {checked ? t("yes") : "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}
