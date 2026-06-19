"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Edit2, X, Archive, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { presenceLabel, type PresenceKey } from "@/lib/i18n/labels";
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { apiClient } from "@/lib/api";
import {
  getChildEnrollmentBirthdateLimits,
  getChildEnrollmentBirthdateValidation,
  isValidName,
} from "@/lib/form-validation";
import { CHILD_ENROLLMENT_AGE_POLICY, formatAgeBound } from "@/lib/child-age-policy";
import { FamilySearchSelect } from "@/components/admin/family-search-select";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";

type EnseignantClasseItem = {
  enseignant: {
    utilisateur?: {
      id: string;
      prenom: string;
      nom: string;
      email?: string;
    } | null;
  } | null;
};

type ClasseItem = {
  id: string;
  nom: string;
  trancheAge?: string | null;
  enseignants?: EnseignantClasseItem[];
};

type EnfantItem = {
  id: string;
  name: string;
  prenom?: string;
  nom?: string;
  genre?: string;
  remarques?: string;
  group: string;
  classId?: string;
  teacher: string;
  parent: string;
  todayStatusCode?: PresenceKey;
  presences?: Array<{
    id: string;
    date: string;
    statut: string;
  }>;
};

/** Présence du jour : même clé UTC que le backend (après fix UTC) ; repli si l’API ne renvoie qu’un ligne « jour courant ». */
function resolveTodayPresence(presences: any[] | undefined, todayUtc: string): any | undefined {
  if (!presences?.length) return undefined;
  const byIso = presences.find((presence: any) => {
    try {
      if (!presence.date) return false;
      const dateObj = new Date(presence.date);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj.toISOString().split("T")[0] === todayUtc;
    } catch {
      return false;
    }
  });
  if (byIso) return byIso;
  if (presences.length === 1) return presences[0];
  return undefined;
}

function mapEnfantApiToItem(enfant: any, todayUtc: string): EnfantItem {
  const fullName = `${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim();
  const group = enfant.classe?.nom ?? "—";
  const tuteurs = enfant.famille?.tuteurs ?? [];
  const principal = tuteurs.find((t: any) => t.principal) ?? tuteurs[0];
  const parentName = principal
    ? `${principal.prenom ?? ""} ${principal.nom ?? ""}`.trim() || principal.telephone || "—"
    : "—";

  let todayStatusCode: PresenceKey = undefined;
  if (enfant.presences && Array.isArray(enfant.presences)) {
    const todayPresence = resolveTodayPresence(enfant.presences, todayUtc);
    if (todayPresence) {
      if (todayPresence.statut === "Present") todayStatusCode = "Present";
      else if (todayPresence.statut === "Absent") todayStatusCode = "Absent";
      else if (todayPresence.statut === "Justifie") todayStatusCode = "Justifie";
    }
  }

  return {
    id: enfant.id,
    prenom: enfant.prenom ?? "",
    nom: enfant.nom ?? "",
    name: fullName || "—",
    group,
    classId: enfant.classeId ?? enfant.classe?.id ?? undefined,
    genre: enfant.genre ?? undefined,
    remarques: enfant.remarques ?? undefined,
    teacher: "—",
    parent: parentName,
    todayStatusCode,
    presences:
      enfant.presences
        ?.map((presence: any) => {
          try {
            if (!presence.date) return null;
            const dateObj = new Date(presence.date);
            if (isNaN(dateObj.getTime())) return null;
            return {
              id: presence.id,
              date: dateObj.toISOString().split("T")[0],
              statut: presence.statut,
            };
          } catch (e) {
            console.warn("Invalid date in presence:", presence.date, e);
            return null;
          }
        })
        .filter((p: any) => p !== null) || [],
  };
}

function buildEditFormFromEnfant(enfant: any) {
  return {
    prenom: enfant.prenom ?? "",
    nom: enfant.nom ?? "",
    genre: enfant.genre ?? "",
    classeId: enfant.classeId ?? enfant.classe?.id ?? "",
    remarques: enfant.remarques ?? "",
  };
}

export default function EnfantsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  use(params);
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('admin.children');
  const tp = useTranslations('admin.children.presence');
  const dateLocale = currentLocale === 'ar' ? 'ar-MA' : 'fr-FR';
  const birthdateValidationMessages = {
    required: t('errors.birthRequired'),
    invalidFormat: t('errors.birthInvalidFormat'),
    invalid: t('errors.birthInvalid'),
    tooYoung: (min: string, age: string) => t('errors.birthTooYoung', { min, age }),
    tooOld: (max: string, age: string) => t('errors.birthTooOld', { max, age }),
  };
  const [search, setSearch] = useState("");
  const [children, setChildren] = useState<EnfantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [families, setFamilies] = useState<{ id: string; emailPrincipal: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EnfantItem | null>(null);
  const [editForm, setEditForm] = useState({ prenom: "", nom: "", genre: "", classeId: "", remarques: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    familleId: "",
    classeId: "",
    dateNaissance: "",
  });
  const birthdateLimits = getChildEnrollmentBirthdateLimits();
  const birthdateError = formData.dateNaissance
    ? getChildEnrollmentBirthdateValidation(formData.dateNaissance, birthdateValidationMessages)
    : null;
  
  // Date d'aujourd'hui pour filtrer les présences
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let cancelled = false;

    async function fetchChildren() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.listChildren(1, 50, showArchived);
        const items = res.data.items ?? res.data.data ?? [];

        const mapped: EnfantItem[] = items.map((enfant: any) => mapEnfantApiToItem(enfant, today));

        if (!cancelled) {
          setChildren(mapped);
        }
      } catch (err) {
        console.error("[Admin/Enfants] Error loading children", err);
        if (!cancelled) {
          setError(t('errors.loadChildren'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchChildren();

    // Charger les classes pour le select de groupe
    async function fetchClasses() {
      try {
        const res = await apiClient.listClasses();
        const classesData: ClasseItem[] = res.data?.items ?? res.data ?? [];
        setClasses(classesData);

        // Dériver la liste des enseignants uniques à partir des classes
        const teacherMap = new Map<string, string>();
        for (const cl of classesData) {
          if (!cl.enseignants) continue;
          for (const ec of cl.enseignants) {
            const u = ec.enseignant?.utilisateur;
            if (u && u.id && !teacherMap.has(u.id)) {
              const fullName = `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || u.email || u.id;
              teacherMap.set(u.id, fullName);
            }
          }
        }
        setTeachers(Array.from(teacherMap.entries()).map(([id, name]) => ({ id, name })));
      } catch (err) {
        console.error("[Admin/Enfants] Error loading classes", err);
      }
    }

    fetchClasses();

    return () => {
      cancelled = true;
    };
  }, [t, today, showArchived]);

  const handleChangeClass = async (id: string, classId: string) => {
    try {
      await apiClient.updateChild(id, {
        classe: classId ? { connect: { id: classId } } : { disconnect: true },
      });
      setChildren((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                classId,
                group: classes.find((cl) => cl.id === classId)?.nom ?? "—",
              }
            : c,
        ),
      );
    } catch (err) {
      console.error("[Admin/Enfants] Error updating class", err);
      notifyError(getApiErrorMessage(err, t('errors.updateClass')));
    }
  };

  const handleChangeStatus = async (id: string, rawStatut: string) => {
    try {
      const allowed = new Set(["Present", "Absent", "Justifie"]);
      const statut = allowed.has(rawStatut)
        ? (rawStatut as "Present" | "Absent" | "Justifie")
        : null;

      await apiClient.updateChildStatus(id, statut);

      setChildren((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;

          const updatedPresences = [...(c.presences || [])];
          const todayIndex = updatedPresences.findIndex((p) => p.date === today);

          if (!statut) {
            if (todayIndex !== -1) {
              updatedPresences.splice(todayIndex, 1);
            }
            return {
              ...c,
              todayStatusCode: undefined,
              presences: updatedPresences,
            };
          }

          if (todayIndex !== -1) {
            updatedPresences[todayIndex] = {
              ...updatedPresences[todayIndex],
              statut,
            };
          } else {
            updatedPresences.push({
              id: `temp-${Date.now()}`,
              date: today,
              statut,
            });
          }

          return {
            ...c,
            todayStatusCode: statut,
            presences: updatedPresences,
          };
        }),
      );
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.updateStatus');
      console.error("[Admin/Enfants] Error updating status", err);
      notifyError(getApiErrorMessage(err, String(detail)));
    }
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!isValidName(formData.prenom) || !isValidName(formData.nom)) {
        notifyError(t('errors.nameInvalid'));
        return;
      }
      if (!formData.familleId || !formData.classeId || !formData.dateNaissance) {
        notifyError(t('errors.requiredFields'));
        return;
      }
      const dateError = getChildEnrollmentBirthdateValidation(formData.dateNaissance, birthdateValidationMessages);
      if (dateError) {
        notifyError(dateError);
        return;
      }

      await apiClient.createChild({
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        famille: {
          connect: { id: formData.familleId },
        },
        classe: {
          connect: { id: formData.classeId },
        },
        dateNaissance: `${formData.dateNaissance}T12:00:00.000Z`,
      });

      // Après création/mise à jour, on recharge la liste
      const res = await apiClient.listChildren(1, 50);
      const items = res.data.items ?? res.data.data ?? [];
      const mapped: EnfantItem[] = items.map((enfant: any) => mapEnfantApiToItem(enfant, today));
      setChildren(mapped);

      setFormData({ prenom: "", nom: "", familleId: "", classeId: "", dateNaissance: "" });
      setModalOpen(false);
    } catch (err) {
      console.error("[Admin/Enfants] Error saving child", err);
      notifyError(getApiErrorMessage(err, t('errors.saveChild')));
    }
  };


  const handleEditOpen = async (child: EnfantItem) => {
    setEditTarget(child);
    setEditForm(buildEditFormFromEnfant(child));
    setEditModalOpen(true);
    setEditLoading(true);

    try {
      const res = await apiClient.getChild(child.id);
      const enfant = res.data as any;
      setEditForm(buildEditFormFromEnfant(enfant));
      setEditTarget((prev) =>
        prev?.id === child.id ? mapEnfantApiToItem(enfant, today) : prev,
      );
    } catch (err) {
      console.error("[Admin/Enfants] Error loading child for edit", err);
      notifyError(getApiErrorMessage(err, t("errors.loadChildren")));
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      await apiClient.updateChild(editTarget.id, {
        prenom: editForm.prenom,
        nom: editForm.nom,
        genre: editForm.genre || undefined,
        classeId: editForm.classeId || undefined,
        remarques: editForm.remarques || undefined,
      });
      setChildren((prev) =>
        prev.map((c) =>
          c.id === editTarget.id
            ? {
                ...c,
                prenom: editForm.prenom,
                nom: editForm.nom,
                name: `${editForm.prenom} ${editForm.nom}`.trim(),
                genre: editForm.genre,
                classId: editForm.classeId || undefined,
                remarques: editForm.remarques,
                group: classes.find((cl) => cl.id === editForm.classeId)?.nom ?? c.group,
              }
            : c,
        ),
      );
      setEditModalOpen(false);
      setEditTarget(null);
    } catch (err) {
      console.error("[Admin/Enfants] Error editing child", err);
      notifyError(getApiErrorMessage(err, t('errors.editChild')));
    } finally {
      setEditSaving(false);
    }
  };
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await apiClient.deleteChild(archiveTarget.id);
      setChildren((prev) => prev.filter((c) => c.id !== archiveTarget.id));
      notifySuccess(t("archiveChildSuccess"));
    } catch (err) {
      console.error("[Admin/Enfants] Error archiving child", err);
      notifyError(getApiErrorMessage(err, t('errors.archiveChild')));
    } finally {
      setArchiveTarget(null);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreTarget) return;
    try {
      await apiClient.restoreChild(restoreTarget.id);
      setChildren((prev) => prev.filter((c) => c.id !== restoreTarget.id));
      notifySuccess(t("restoreChildSuccess"));
    } catch (err) {
      console.error("[Admin/Enfants] Error restoring child", err);
      notifyError(getApiErrorMessage(err, t("errors.restoreChild")));
    } finally {
      setRestoreTarget(null);
    }
  };

  const filtered = children.filter((child) => {
    const q = search.toLowerCase();
    if (q && !child.name.toLowerCase().includes(q)) {
      return false;
    }

    if (selectedClassId && child.classId !== selectedClassId) {
      return false;
    }

    if (selectedTeacherId) {
      const childClasse = classes.find((cl) => cl.id === child.classId);
      if (!childClasse || !childClasse.enseignants || childClasse.enseignants.length === 0) {
        return false;
      }
      const taughtBySelected = childClasse.enseignants.some((ec) => {
        const u = ec.enseignant?.utilisateur;
        return u?.id === selectedTeacherId;
      });
      if (!taughtBySelected) {
        return false;
      }
    }

    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SidebarNew currentLocale={currentLocale} />
      
      {/* Main Content */}
      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? t('countLoading') : t('count', { count: children.length })} · {new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={showArchived ? "outline" : "default"}
                onClick={() => { setShowArchived(false); setPage(1); }}
              >
                {t("viewActiveChildren")}
              </Button>
              <Button
                variant={showArchived ? "default" : "outline"}
                onClick={() => { setShowArchived(true); setPage(1); }}
              >
                <Archive className="h-4 w-4 mr-1" aria-hidden />
                {t("viewArchivedChildren")}
              </Button>
              {!showArchived ? (
                <Button
                  onClick={async () => {
                    try {
                      const res = await apiClient.listChildFamilies();
                      setFamilies(res.data ?? []);
                      setModalOpen(true);
                    } catch (err) {
                      console.error('[Admin/Enfants] Error loading families', err);
                      notifyError(t('errors.loadFamilies'));
                    }
                  }}
                >
                  + {t('add')}
                </Button>
              ) : null}
            </div>
          </div>

          <Card className="p-6">
            {error && (
              <p className="mb-4 text-sm text-destructive">{error}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="ps-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="border border-input rounded-md px-2 py-2 text-xs bg-background flex-1 min-w-[130px]"
                >
                  <option value="">{t('allClasses')}</option>
                  {classes.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.nom}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="border border-input rounded-md px-2 py-2 text-xs bg-background flex-1 min-w-[130px]"
                >
                  <option value="">{t('allTeachers')}</option>
                  {teachers.map((tch) => (
                    <option key={tch.id} value={tch.id}>
                      {tch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('loading')}</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{showArchived ? t("noArchivedChildren") : t('empty')}</p>
              ) : (
                paginated.map((child) => (
                  <div key={child.id} className="rounded-lg border bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{child.name}</p>
                        <p className="text-xs text-muted-foreground">{child.parent}</p>
                      </div>
                      <div className="flex gap-2">
                        {!showArchived ? (
                          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleEditOpen(child)} aria-label={t('edit')}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        ) : null}
                        <Link href={`/${currentLocale}/admin/enfants/${child.id}`} className="inline-flex items-center gap-1 px-2 py-1 border rounded text-xs hover:bg-muted">
                          <Eye className="w-3 h-3" /> {t('view')}
                        </Link>
                        {showArchived ? (
                          <Button size="icon" variant="info-outline" className="h-7 w-7" onClick={() => setRestoreTarget({ id: child.id, name: child.name })} aria-label={t("restoreChild")}>
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="warning-outline" className="h-7 w-7" onClick={() => setArchiveTarget({ id: child.id, name: child.name })} aria-label={t('archive')}>
                            <Archive className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!showArchived ? (
                      <div className="flex gap-2 flex-wrap items-center">
                        <select value={child.classId ?? ""} onChange={(e) => handleChangeClass(child.id, e.target.value)} className="border border-input rounded-md px-2 py-1 text-xs bg-background flex-1 min-w-[110px]">
                          <option value="">{t('classPlaceholder')}</option>
                          {classes.map((cl) => (<option key={cl.id} value={cl.id}>{cl.nom}</option>))}
                        </select>
                        <select value={child.todayStatusCode ?? ""} onChange={(e) => handleChangeStatus(child.id, e.target.value)} className="border border-input rounded-md px-2 py-1 text-xs bg-background flex-1 min-w-[110px]">
                          <option value="">{tp('selecting')}</option>
                          <option value="Present">{tp('present')}</option>
                          <option value="Absent">{tp('absent')}</option>
                          <option value="Justifie">{tp('justified')}</option>
                        </select>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">{t("archivedChildBadge")}</Badge>
                    )}
                    {child.todayStatusCode && (
                      <Badge className={
                        child.todayStatusCode === "Present" ? "pp-surface-success border" :
                        child.todayStatusCode === "Absent" ? "bg-red-100 text-red-700" :
                        child.todayStatusCode === "Justifie" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }>{presenceLabel(child.todayStatusCode, tp)}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-start font-semibold text-foreground">{t('name')}</th>
                      <th className="px-6 py-3 text-start font-semibold text-foreground">{t('group')}</th>
                      <th className="px-6 py-3 text-start font-semibold text-foreground">{t('parent')}</th>
                      <th className="px-6 py-3 text-start font-semibold text-foreground">{t('presenceToday')}</th>
                      <th className="px-6 py-3 text-start font-semibold text-foreground">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">
                          {t('loadingChildren')}
                        </td>
                      </tr>
                    ) : filtered.length > 0 ? (
                      paginated.map((child) => (
                        <tr
                          key={child.id}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="px-6 py-3 font-medium">{child.name}</td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {showArchived ? (
                              <Badge variant="outline" className="text-xs">{t("archivedChildBadge")}</Badge>
                            ) : (
                              <select
                                value={child.classId ?? ""}
                                onChange={(e) => handleChangeClass(child.id, e.target.value)}
                                className="border border-input rounded-md px-2 py-1 text-xs bg-background"
                              >
                                <option value="">—</option>
                                {classes.map((cl) => (
                                  <option key={cl.id} value={cl.id}>
                                    {cl.nom}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-3 text-muted-foreground text-xs">{child.parent}</td>
                          <td className="px-6 py-3">
                            {!showArchived ? (
                            <select
                              value={child.todayStatusCode ?? ""}
                              onChange={(e) => handleChangeStatus(child.id, e.target.value)}
                              className="border border-input rounded-md px-2 py-1 text-xs bg-background mb-1"
                            >
                              <option value="">{tp('select')}</option>
                              <option value="Present">{tp('present')}</option>
                              <option value="Absent">{tp('absent')}</option>
                              <option value="Justifie">{tp('justified')}</option>
                            </select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("readOnly")}</span>
                            )}
                            {child.todayStatusCode && (
                            <Badge
                              className={
                                child.todayStatusCode === "Present"
                                  ? "pp-surface-success border"
                                  : child.todayStatusCode === "Absent"
                                  ? "bg-red-100 text-red-700"
                                  : child.todayStatusCode === "Justifie"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }
                            >
                              {presenceLabel(child.todayStatusCode, tp)}
                            </Badge>
                            )}
                            {child.presences && child.presences.length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {t('history')}: {child.presences.slice(-3).map(p => {
                                  try {
                                    const dateObj = new Date(p.date);
                                    if (isNaN(dateObj.getTime())) return null;
                                    return `${dateObj.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })}: ${p.statut === 'Present' ? '✓' : p.statut === 'Absent' ? '✗' : '~'}`;
                                  } catch (e) {
                                    return null;
                                  }
                                }).filter((s: any) => s !== null).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 flex gap-2 justify-end">
                            {!showArchived ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditOpen(child)}
                                className="gap-1 text-xs"
                              >
                                <Edit2 className="w-3 h-3" />
                                {t('edit')}
                              </Button>
                            ) : null}
                            <Link
                              href={`/${currentLocale}/admin/enfants/${child.id}`}
                              className="inline-flex items-center gap-2 px-3 py-1 border rounded text-xs hover:bg-muted"
                            >
                              <Eye className="w-4 h-4" />
                              {t('viewProfile')}
                            </Link>
                            {showArchived ? (
                              <Button
                                size="sm"
                                variant="info-outline"
                                className="gap-1 text-xs"
                                onClick={() => setRestoreTarget({ id: child.id, name: child.name })}
                              >
                                <RotateCcw className="w-3 h-3" />
                                {t("restoreChild")}
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="warning-outline"
                                onClick={() => setArchiveTarget({ id: child.id, name: child.name })}
                                aria-label={t('archive')}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">
                          {showArchived ? t("noArchivedChildren") : t('noResults')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {filtered.length > 0 ? (
              <AdminListPagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </Card>
        </div>
      </AdminMainContent>

      {/* Modal ajout enfant */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{t('addChild')}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.firstName')}</label>
                  <Input
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.lastName')}</label>
                  <Input
                    name="nom"
                    value={formData.nom}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('form.family')} <span className="text-red-500">*</span>
                </label>
                <FamilySearchSelect
                  families={families}
                  value={formData.familleId}
                  onChange={familleId =>
                    setFormData(prev => ({ ...prev, familleId }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('form.class')} <span className="text-red-500">*</span>
                </label>
                {classes.length === 0 ? (
                  <p className="text-sm text-red-600">{t('form.noClassAvailable')}</p>
                ) : (
                  <select
                    name="classeId"
                    value={formData.classeId}
                    onChange={handleFormChange}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                    required
                  >
                    <option value="">{t('form.selectClass')}</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('form.birthDate')}</label>
                <Input
                  type="date"
                  name="dateNaissance"
                  min={birthdateLimits.min}
                  max={birthdateLimits.max}
                  pattern="[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])"
                  title={t('form.birthDateTitle')}
                  value={formData.dateNaissance}
                  onChange={handleFormChange}
                  className={birthdateError ? "border-red-400 focus-visible:ring-red-300" : ""}
                  required
                />
                {birthdateError && <p className="mt-1 text-xs text-red-500">{birthdateError}</p>}
                {!birthdateError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('form.birthDateHint', {
                      min: formatAgeBound(CHILD_ENROLLMENT_AGE_POLICY.minAge),
                      max: formatAgeBound(CHILD_ENROLLMENT_AGE_POLICY.maxAge),
                    })}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalOpen(false);
                    setFormData({ prenom: "", nom: "", familleId: "", classeId: "", dateNaissance: "" });
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !formData.familleId ||
                    !formData.classeId ||
                    classes.length === 0
                  }
                >
                  {t('save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editModalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{t('editTitle', { name: editTarget.name })}</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded hover:bg-gray-100" aria-label={t('cancel')}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {editLoading ? (
                <p className="text-sm text-muted-foreground">Chargement des informations…</p>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.firstName')}</label>
                  <Input value={editForm.prenom} disabled={editLoading} onChange={(e) => setEditForm((prev) => ({ ...prev, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.lastName')}</label>
                  <Input value={editForm.nom} disabled={editLoading} onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.gender')}</label>
                  <select value={editForm.genre} disabled={editLoading} onChange={(e) => setEditForm((prev) => ({ ...prev, genre: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t('form.genderUnset')}</option>
                    <option value="M">{t('form.boy')}</option>
                    <option value="F">{t('form.girl')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.class')}</label>
                  <select value={editForm.classeId} disabled={editLoading} onChange={(e) => setEditForm((prev) => ({ ...prev, classeId: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-background">
                    <option value="">{t('noClass')}</option>
                    {classes.map((cl) => (<option key={cl.id} value={cl.id}>{cl.nom}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.remarks')}</label>
                <textarea value={editForm.remarques} disabled={editLoading} onChange={(e) => setEditForm((prev) => ({ ...prev, remarques: e.target.value }))} placeholder={t('form.remarksPh')} rows={3} className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleEditSave} disabled={editSaving || editLoading} className="flex-1">
                  {editSaving ? t('saving') : t('save')}
                </Button>
                <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editSaving}>{t('cancel')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {restoreTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                <RotateCcw className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t("restoreChildTitle")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{restoreTarget.name}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={handleRestoreConfirm}>
                {t("restoreChild")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRestoreTarget(null)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal confirmation archivage */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Archive className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t('archiveTitle')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{archiveTarget.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {t('archiveLegal')}
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="warning"
                className="flex-1"
                onClick={handleArchiveConfirm}
              >
                {t('archiveConfirm')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setArchiveTarget(null)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}