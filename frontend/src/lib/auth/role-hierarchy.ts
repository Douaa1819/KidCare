/** Un admin classique ne peut pas gérer les comptes Super Admin ni Admin. */
export function canAdminManageUserRole(
  callerRole: string,
  targetRole: string,
): boolean {
  if (targetRole === "SUPER_ADMIN") return false;
  if (targetRole === "ADMIN" && callerRole !== "SUPER_ADMIN") return false;
  return true;
}
