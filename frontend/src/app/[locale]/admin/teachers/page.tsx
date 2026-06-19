"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { USER_STATUS_BADGE_VARIANT } from "@/lib/design/status-badges";
import type { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { isValidEmail, isValidName } from "@/lib/form-validation";
import { IntlError, IntlErrorCode } from "next-intl";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";

interface TeachersPageProps {
  params: Promise<{ locale: Locale }>;
}

interface ClassAssignment {
  classeId: string;
  nom: string;
  niveau?: string | null;
}

interface TeacherItem {
  userId: string;
  enseignantId: string | null;
  fullName: string;
  email: string;
  statut: string;
  inviteLe?: string | null;
  assignedClasses: ClassAssignment[];
}

const TEACHERS_PAGE_SIZE = 10;

const TEACHERS_FALLBACK: Record<Locale, Record<string, string>> = {
  fr: {
    deleteTeacher: "Supprimer",
    deleteConfirm: "Supprimer cet enseignant ?",
    deleteConfirmDetail:
      "L'enseignant {name} ({email}) sera supprimé définitivement, ainsi que ses assignations aux classes.",
    deleteSuccess: "Enseignant supprimé.",
    deleteError: "Erreur lors de la suppression de l'enseignant.",
    cancelInvite: "Annuler invitation",
    cancelInviteConfirm: "Annuler cette invitation ?",
    cancelInviteDetail:
      "Les identifiants temporaires seront invalidés et l'enseignant ne pourra plus se connecter avec cette invitation.",
    prev: "Précédent",
    next: "Suivant",
    cancel: "Annuler",
    profile: "Profil",
    invite: "Inviter",
  },
  ar: {
    deleteTeacher: "حذف",
    deleteConfirm: "حذف هذا المعلم؟",
    deleteConfirmDetail: "سيتم حذف المعلم {name} ({email}) نهائياً، وإزالة إسناداته من الفصول.",
    deleteSuccess: "تم حذف المعلم.",
    deleteError: "خطأ أثناء حذف المعلم.",
    cancelInvite: "إلغاء الدعوة",
    cancelInviteConfirm: "إلغاء هذه الدعوة؟",
    cancelInviteDetail: "سيتم إبطال المعرفات المؤقتة ولن يتمكن المعلم من الاتصال بهذه الدعوة.",
    prev: "السابق",
    next: "التالي",
    cancel: "إلغاء",
    profile: "الملف",
    invite: "دعوة",
  },
};

function applyTeachersFallback(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>,
): string {
  let fb = TEACHERS_FALLBACK[locale][key] ?? TEACHERS_FALLBACK.fr[key] ?? key;
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      fb = fb.replace(`{${k}}`, String(v));
    }
  }
  return fb;
}

function teachersLabel(
  locale: Locale,
  tt: (key: string, values?: Record<string, string | number>) => string,
  key: string,
  values?: Record<string, string | number>,
): string {
  try {
    const raw = values ? tt(key, values) : tt(key);
    if (typeof raw === "string" && raw && raw !== key && !raw.includes("admin.teachersManage")) {
      return raw;
    }
  } catch (error) {
    if (!(error instanceof IntlError && error.code === IntlErrorCode.MISSING_MESSAGE)) {
      throw error;
    }
  }
  return applyTeachersFallback(locale, key, values);
}

interface ClassItem {
  id: string;
  nom: string;
  niveau?: string | null;
  enseignants?: Array<{
    enseignant: {
      id: string;
      utilisateur?: { id: string } | null;
    };
  }>;
}

export default function TeachersPage({ params }: TeachersPageProps) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const tt = useTranslations("admin.teachersManage");
  const t = (key: string, values?: Record<string, string | number>) =>
    teachersLabel(currentLocale, tt, key, values);

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTeacher, setNewTeacher] = useState({ prenom: "", nom: "", email: "" });
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ teacher: TeacherItem; classeId: string } | null>(null);
  const [unassignPending, setUnassignPending] = useState(false);
  const [cancelInviteTarget, setCancelInviteTarget] = useState<TeacherItem | null>(null);
  const [cancelInvitePending, setCancelInvitePending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, classesRes] = await Promise.all([
        apiClient.listUsers({ role: "ENSEIGNANT", limit: 200 }),
        apiClient.listClasses(),
      ]);

      const usersPayload = usersRes.data;
      const usersAll: any[] = Array.isArray(usersPayload?.data)
        ? usersPayload.data
        : Array.isArray(usersPayload?.items)
        ? usersPayload.items
        : Array.isArray(usersPayload)
        ? usersPayload
        : [];

      const classesData: ClassItem[] = (() => {
        const p = classesRes.data;
        return Array.isArray(p?.data) ? p.data : Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [];
      })();

      // Build teacher list with their assigned classes
      const teacherItems: TeacherItem[] = usersAll.map((u: any) => {
        // Find all classes where this teacher is assigned
        const assignedClasses: ClassAssignment[] = classesData
          .filter((c) =>
            Array.isArray(c.enseignants) &&
            c.enseignants.some(
              (ec) =>
                ec.enseignant?.utilisateur?.id === u.id ||
                (u.enseignantId && ec.enseignant?.id === u.enseignantId),
            ),
          )
          .map((c) => ({ classeId: c.id, nom: c.nom, niveau: c.niveau }));

        return {
          userId: u.id,
          enseignantId: u.enseignantId ?? null,
          fullName: `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || u.email,
          email: u.email,
          statut: u.statut,
          inviteLe: u.inviteLe ?? null,
          assignedClasses,
        };
      });

      setTeachers(teacherItems);
      setClasses(classesData);
    } catch (err) {
      console.error("[Admin/Teachers] Error loading data", err);
      setError(tt("loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(teachers.length / TEACHERS_PAGE_SIZE));
    if (page > maxPage) setPage(maxPage);
  }, [teachers.length, page]);

  const handleCreateTeacher = async () => {
    setCreateError(null);
    const nextTeacher = {
      prenom: newTeacher.prenom.trim(),
      nom: newTeacher.nom.trim(),
      email: newTeacher.email.trim().toLowerCase(),
    };
    if (!nextTeacher.email || !nextTeacher.prenom || !nextTeacher.nom) {
      setCreateError(tt("createRequired"));
      return;
    }
    if (!isValidName(nextTeacher.prenom) || !isValidName(nextTeacher.nom)) {
      setCreateError("Le prénom et le nom doivent contenir uniquement des lettres.");
      return;
    }
    if (!isValidEmail(nextTeacher.email)) {
      setCreateError("Adresse email invalide.");
      return;
    }
    if (teachers.some((teacher) => teacher.email.toLowerCase() === nextTeacher.email)) {
      setCreateError("Un enseignant avec cet email existe déjà.");
      return;
    }
    try {
      setCreating(true);
      await apiClient.createUser({ ...nextTeacher, role: "ENSEIGNANT" });
      setNewTeacher({ prenom: "", nom: "", email: "" });
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setCreateError(typeof msg === "string" ? msg : Array.isArray(msg) ? msg.join(" ") : tt("createError"));
    } finally {
      setCreating(false);
    }
  };

  const handleAssignClass = async (teacherUserId: string) => {
    if (!selectedClassId) return;
    try {
      setAssignLoading(true);
      await apiClient.assignTeacherToClass(teacherUserId, selectedClassId);
      setAssigningTeacherId(null);
      setSelectedClassId("");
      await fetchData();
    } catch (err: unknown) {
      notifyError(getApiErrorMessage(err, tt("assignError")));
    } finally {
      setAssignLoading(false);
    }
  };

  const confirmUnassign = async () => {
    const teacher = unassignTarget?.teacher;
    const classeId = unassignTarget?.classeId;
    if (!teacher?.enseignantId || !classeId) return;
    try {
      setUnassignPending(true);
      await apiClient.removeTeacherFromClass(classeId, teacher.enseignantId);
      setUnassignTarget(null);
      await fetchData();
    } catch (err: unknown) {
      notifyError(getApiErrorMessage(err, tt("removeError")));
    } finally {
      setUnassignPending(false);
    }
  };

  const confirmCancelInvite = async () => {
    const teacher = cancelInviteTarget;
    if (!teacher) return;
    try {
      setCancelInvitePending(true);
      await apiClient.updateUserStatus(teacher.userId, "DISABLED");
      setCancelInviteTarget(null);
      await fetchData();
    } catch (err: unknown) {
      notifyError(getApiErrorMessage(err, "Annulation de l'invitation impossible."));
    } finally {
      setCancelInvitePending(false);
    }
  };

  const confirmDeleteTeacher = async () => {
    const teacher = deleteTarget;
    if (!teacher) return;
    try {
      setDeletePending(true);
      await apiClient.deleteUser(teacher.userId);
      setDeleteTarget(null);
      notifySuccess(t("deleteSuccess"));
      await fetchData();
      setPage(1);
    } catch (err: unknown) {
      notifyError(getApiErrorMessage(err, t("deleteError")));
    } finally {
      setDeletePending(false);
    }
  };

  const statutBadgeVariant = (s: string) => USER_STATUS_BADGE_VARIANT[s] ?? "neutral";

  const isInvitationExpired = (teacher: TeacherItem) => {
    if (teacher.statut !== "INVITED" || !teacher.inviteLe) return false;
    const invitedAt = new Date(teacher.inviteLe).getTime();
    return Number.isFinite(invitedAt) && Date.now() - invitedAt > 14 * 24 * 60 * 60 * 1000;
  };

  const teacherEmailValue = newTeacher.email.trim().toLowerCase();
  const teacherEmailAlreadyExists = teacherEmailValue
    ? teachers.some((teacher) => teacher.email.toLowerCase() === teacherEmailValue)
    : false;
  const teacherEmailInlineError = teacherEmailValue && !isValidEmail(teacherEmailValue)
    ? "Adresse email invalide."
    : teacherEmailAlreadyExists
    ? "Un enseignant avec cet email existe déjà."
    : null;

  const statutLabel = (teacher: TeacherItem) => {
    const s = teacher.statut;
    if (isInvitationExpired(teacher)) return "Expirée";
    if (s === "ACTIVE") return tt("statusActive");
    if (s === "INVITED") return "En attente";
    if (s === "DISABLED") return "Annulée / désactivée";
    return s;
  };

  // Classes not yet assigned to this teacher
  const availableClasses = (teacher: TeacherItem) =>
    classes.filter((c) => !teacher.assignedClasses.some((a) => a.classeId === c.id));

  const totalPages = Math.max(1, Math.ceil(teachers.length / TEACHERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTeachers = teachers.slice(
    (currentPage - 1) * TEACHERS_PAGE_SIZE,
    currentPage * TEACHERS_PAGE_SIZE,
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{tt("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? tt("loadingShort") : tt("count", { count: teachers.length })}
              </p>
            </div>
            <Link href={withLocalePath(currentLocale, "/admin")}>
              <Button variant="outline">
                {tt("backDashboard")}
              </Button>
            </Link>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Add teacher form */}
          <Card className="p-5">
            <h2 className="text-base font-semibold mb-3">{tt("inviteTitle")}</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {tt("inviteHint")}
            </p>
            {createError && <p className="text-xs text-destructive mb-2">{createError}</p>}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={tt("firstNamePh")}
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={newTeacher.prenom}
                onChange={(e) => setNewTeacher((p) => ({ ...p, prenom: e.target.value }))}
              />
              <input
                type="text"
                placeholder={tt("lastNamePh")}
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background"
                value={newTeacher.nom}
                onChange={(e) => setNewTeacher((p) => ({ ...p, nom: e.target.value }))}
              />
              <input
                type="email"
                placeholder={tt("emailPh")}
                className={`flex-[2] border rounded-md px-3 py-2 text-sm bg-background ${
                  teacherEmailInlineError ? "border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200" : "border-border"
                }`}
                value={newTeacher.email}
                onChange={(e) => {
                  setCreateError(null);
                  setNewTeacher((p) => ({ ...p, email: e.target.value }));
                }}
              />
              <Button
                onClick={handleCreateTeacher}
                disabled={creating}
                className="whitespace-nowrap"
              >
                {creating ? tt("creating") : t("invite")}
              </Button>
            </div>
            {teacherEmailInlineError && <p className="mt-2 text-xs text-destructive">{teacherEmailInlineError}</p>}
          </Card>

          {/* Teachers list */}
          {loading ? (
            <p className="text-sm text-muted-foreground">{tt("loading")}</p>
          ) : teachers.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <p className="text-muted-foreground">{tt("empty")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {paginatedTeachers.map((teacher) => (
                <Card key={teacher.userId} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Identity */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                        {(teacher.fullName[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{teacher.fullName}</p>
                        <p className="text-xs text-muted-foreground">{teacher.email}</p>
                      </div>
                    </div>

                    {/* Statut + link to profile */}
                    <div className="flex items-center gap-2">
                      <Badge variant={statutBadgeVariant(teacher.statut)} className="uppercase">
                        {statutLabel(teacher)}
                      </Badge>
                      {teacher.statut === "INVITED" && (
                        <Button
                          type="button"
                          variant="destructive-outline"
                          size="sm"
                          onClick={() => setCancelInviteTarget(teacher)}
                        >
                          {t("cancelInvite")}
                        </Button>
                      )}
                      <Link href={withLocalePath(currentLocale, `/admin/utilisateurs/${teacher.userId}`)}>
                        <Button variant="outline" size="sm">
                          {t("profile")}
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(teacher)}
                      >
                        {t("deleteTeacher")}
                      </Button>
                    </div>
                  </div>

                  {/* Assigned classes */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {tt("assignedClasses")}
                    </p>
                    <div className="flex flex-wrap gap-2 items-center min-h-[28px]">
                      {teacher.assignedClasses.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{tt("noClass")}</span>
                      ) : (
                        teacher.assignedClasses.map((ac) => (
                          <span
                            key={ac.classeId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700"
                          >
                            {ac.nom}
                            {ac.niveau && (
                              <span className="bg-blue-200 text-blue-800 px-1 py-0.5 rounded text-[10px]">
                                {ac.niveau}
                              </span>
                            )}
                            <button
                              onClick={() => setUnassignTarget({ teacher, classeId: ac.classeId })}
                              className="ml-0.5 text-blue-400 hover:text-red-500 transition-colors"
                              title={tt("removeTitle")}
                            >
                              ×
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assign to class */}
                  <div className="mt-3">
                    {assigningTeacherId === teacher.userId ? (
                      <div className="flex gap-2 items-center">
                        <select
                          className="border border-border rounded-md px-2 py-1 text-sm bg-background flex-1 max-w-xs"
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                          <option value="">{tt("chooseClass")}</option>
                          {availableClasses(teacher).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}{c.niveau ? ` (${c.niveau})` : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleAssignClass(teacher.userId)}
                          disabled={assignLoading || !selectedClassId}
                        >
                          {tt("assign")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setAssigningTeacherId(null); setSelectedClassId(""); }}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAssigningTeacherId(teacher.userId); setSelectedClassId(""); }}
                        disabled={availableClasses(teacher).length === 0}
                      >
                        {tt("assignToClass")}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {teachers.length > 0 ? (
                <AdminListPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={teachers.length}
                  pageSize={TEACHERS_PAGE_SIZE}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
          )}
        </div>
      </AdminMainContent>

      <SimpleConfirmDialog
        open={Boolean(unassignTarget)}
        title={tt("unassignConfirm")}
        confirmLabel={tt("removeTitle")}
        cancelLabel={t("cancel")}
        variant="destructive"
        pending={unassignPending}
        onCancel={() => {
          if (!unassignPending) setUnassignTarget(null);
        }}
        onConfirm={confirmUnassign}
      />
      <SimpleConfirmDialog
        open={Boolean(cancelInviteTarget)}
        title={t("cancelInviteConfirm")}
        description={t("cancelInviteDetail")}
        confirmLabel={t("cancelInvite")}
        cancelLabel={t("cancel")}
        variant="destructive"
        pending={cancelInvitePending}
        onCancel={() => {
          if (!cancelInvitePending) setCancelInviteTarget(null);
        }}
        onConfirm={confirmCancelInvite}
      />
      <SimpleConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("deleteConfirm")}
        description={
          deleteTarget
            ? t("deleteConfirmDetail", { name: deleteTarget.fullName, email: deleteTarget.email })
            : undefined
        }
        confirmLabel={t("deleteTeacher")}
        cancelLabel={t("cancel")}
        variant="destructive"
        pending={deletePending}
        onCancel={() => {
          if (!deletePending) setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteTeacher}
      />
    </div>
  );
}
