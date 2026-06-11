"use client";

import { useState, useEffect, use } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Users, UserPlus, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import { getApiErrorMessage, notifyError } from "@/lib/feedback";
import {
  displayTrancheAge,
  formatTrancheAgeFromPolicy,
  parseTrancheAgeToPolicy,
} from "@/lib/class-age";
import { ChildAgeIntervalFields } from "@/components/child-age-interval-fields";
import {
  getDefaultChildAgePolicy,
  validateChildAgePolicy,
  type ChildAgePolicy,
} from "@/lib/child-age-policy";

interface EnseignantInClasse {
  enseignant: {
    id: string;
    utilisateur: {
      id: string;
      prenom: string;
      nom: string;
      email: string;
    };
  };
}

interface Classe {
  id: string;
  nom: string;
  capacite?: number;
  trancheAge?: string;
  active: boolean;
  enseignants?: EnseignantInClasse[];
  _count?: { enfants: number };
}

interface TeacherUser {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  statut: string;
}

export default function ClassesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const tc = useTranslations("admin.classesManage");
  const [classes, setClasses] = useState<Classe[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    niveau: "",
    capacite: "",
    active: true,
  });
  const [agePolicy, setAgePolicy] = useState<ChildAgePolicy>(() => getDefaultChildAgePolicy());
  const [formAgeError, setFormAgeError] = useState<string | null>(null);
  // Teacher assignment state per class
  const [assigningClassId, setAssigningClassId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ classeId: string; enseignantId: string } | null>(null);
  const [unassignPending, setUnassignPending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, teachersRes] = await Promise.all([
        apiClient.listClasses(),
        apiClient.listUsers({ role: "ENSEIGNANT", limit: 200 }),
      ]);
      const payload = classesRes.data;
      const items: any[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];
      setClasses(items);
      setTeachers(teachersRes.data?.data ?? []);
      setError(null);
    } catch (err) {
      console.error("[Classes] Error fetching data:", err);
      setError(tc("loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageError = validateChildAgePolicy(agePolicy, {
      minInvalid: tc("minAgeRequired"),
      maxInvalid: tc("maxAgeRequired"),
      minGtMax: tc("minMaxAgeOrder"),
    });
    if (ageError) {
      setFormAgeError(ageError);
      return;
    }
    setFormAgeError(null);
    const payload = {
      nom: formData.nom,
      niveau: formData.niveau || null,
      capacite: formData.capacite ? Number(formData.capacite) : null,
      trancheAge: formatTrancheAgeFromPolicy(agePolicy),
      active: formData.active,
    };
    try {
      if (editingId) {
        await apiClient.updateClass(editingId, payload);
      } else {
        await apiClient.createClass(payload);
      }
      await fetchData();
      setFormData({ nom: "", niveau: "", capacite: "", active: true });
      setAgePolicy(getDefaultChildAgePolicy());
      setFormAgeError(null);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error("[Classes] Error saving class:", err);
      setError(tc("saveError"));
    }
  };

  const handleEdit = (classe: Classe) => {
    setFormData({
      nom: classe.nom,
      niveau: (classe as any).niveau || "",
      capacite: classe.capacite?.toString() || "",
      active: classe.active,
    });
    setAgePolicy(parseTrancheAgeToPolicy(classe.trancheAge) ?? getDefaultChildAgePolicy());
    setFormAgeError(null);
    setEditingId(classe.id);
    setShowForm(true);
  };

  const confirmDeleteClass = async () => {
    if (!deleteClassId) return;
    try {
      setDeletePending(true);
      await apiClient.deleteClass(deleteClassId);
      setDeleteClassId(null);
      await fetchData();
    } catch (err) {
      console.error("[Classes] Error deleting:", err);
      notifyError(getApiErrorMessage(err, tc("deleteError")));
    } finally {
      setDeletePending(false);
    }
  };

  const handleAssignTeacher = async (classeId: string) => {
    if (!selectedTeacherId) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await apiClient.assignTeacherToClass(selectedTeacherId, classeId);
      await fetchData();
      setAssigningClassId(null);
      setSelectedTeacherId("");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? tc("assignError");
      setAssignError(msg);
    } finally {
      setAssignLoading(false);
    }
  };

  const confirmUnassignTeacher = async () => {
    if (!unassignTarget) return;
    try {
      setUnassignPending(true);
      await apiClient.removeTeacherFromClass(unassignTarget.classeId, unassignTarget.enseignantId);
      setUnassignTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[Classes] Error removing teacher:", err);
      notifyError(getApiErrorMessage(err, "Erreur lors du retrait de l'enseignant"));
    } finally {
      setUnassignPending(false);
    }
  };

  // Teachers not yet assigned to a given class
  const getAvailableTeachers = (classe: Classe): TeacherUser[] => {
    const assignedUserIds = new Set(
      (classe.enseignants ?? []).map((e) => e.enseignant.utilisateur.id)
    );
    return teachers.filter((teacher) => !assignedUserIds.has(teacher.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNew currentLocale={currentLocale} />
        <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">{tc("title")}</h1>
            <p className="text-muted-foreground">{tc("loading")}</p>
          </div>
        </AdminMainContent>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{tc("title")}</h1>
              <p className="text-sm text-muted-foreground">{tc("subtitle")}</p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="gap-2 bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{tc("addClass")}</span>
              <span className="sm:hidden">{tc("addShort")}</span>
            </Button>
          </div>

          {error && (
            <Card className="p-4 bg-destructive/10 border border-destructive/30">
              <p className="text-destructive">{error}</p>
            </Card>
          )}

          {/* FORMULAIRE */}
          {showForm && (
            <Card className="p-6 border-2 border-primary/20">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? tc("formEdit") : tc("formCreate")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{tc("nameLabel")}</label>
                    <Input
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      placeholder="Ex. TPS Les Petits Loups, Classe A…"
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{tc("levelLabel")}</label>
                    <select
                      name="niveau"
                      value={formData.niveau}
                      onChange={handleInputChange}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">{tc("noLevelOption")}</option>
                      <option value="TPS">TPS — Toute Petite Section (18 mois – 2 ans)</option>
                      <option value="PS">PS — Petite Section (2 – 3 ans)</option>
                      <option value="MS">MS — Moyenne Section (3 – 4 ans)</option>
                      <option value="GS">GS — Grande Section (4 – 5 ans)</option>
                    </select>
                  </div>
                </div>
                <ChildAgeIntervalFields
                  policy={agePolicy}
                  onMinChange={minAge => {
                    setFormAgeError(null);
                    setAgePolicy(p => ({ ...p, minAge }));
                  }}
                  onMaxChange={maxAge => {
                    setFormAgeError(null);
                    setAgePolicy(p => ({ ...p, maxAge }));
                  }}
                  labels={{
                    min: tc("minAgeLabel"),
                    max: tc("maxAgeLabel"),
                    unitMonths: "Mois",
                    unitYears: "Ans",
                    hint: "Ex. min. 6 mois ou 2 ans, max. 5 ans.",
                  }}
                />
                {formAgeError ? <p className="text-sm text-red-500">{formAgeError}</p> : null}
                <div>
                  <label className="block text-sm font-medium mb-1">{tc("capacityLabel")}</label>
                  <Input
                    type="number"
                    name="capacite"
                    placeholder={tc("capacityPh")}
                    value={formData.capacite}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="active" className="text-sm font-medium">{tc("activeLabel")}</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {editingId ? tc("submitUpdate") : tc("submitCreate")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                  >
                    {tc("cancel")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* LISTE DES CLASSES */}
          <div className="grid gap-4">
            {classes.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">{tc("emptyState")}</p>
              </Card>
            ) : (
              classes.map((classe) => {
                const assignedTeachers = classe.enseignants ?? [];
                const availableTeachers = getAvailableTeachers(classe);
                const isAssigning = assigningClassId === classe.id;

                return (
                  <Card
                    key={classe.id}
                    className="p-6 border-2 border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {/* Class header */}
                    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{classe.nom}</h3>
                        {classe.active ? (
                          <Badge className="bg-secondary text-secondary-foreground">{tc("badgeActive")}</Badge>
                        ) : (
                          <Badge variant="secondary">{tc("badgeInactive")}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => handleEdit(classe)}>
                          <Edit2 className="w-4 h-4" /><span className="hidden sm:inline">{tc("modify")}</span>
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => setDeleteClassId(classe.id)}>
                          <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">{tc("remove")}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Class info badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(classe as any).niveau && (
                        <div className="px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-full text-xs font-bold text-primary">
                          {(classe as any).niveau}
                        </div>
                      )}
                      {classe.trancheAge && (
                        <div className="p-2 px-3 bg-muted rounded-lg text-sm">
                          <span className="text-xs text-muted-foreground">{tc("agePrefix")} </span>
                          <span className="font-semibold">{displayTrancheAge(classe.trancheAge)}</span>
                        </div>
                      )}
                      {classe.capacite != null && (
                        <div className={`p-2 px-3 rounded-lg text-sm ${
                          classe._count && classe._count.enfants >= classe.capacite
                            ? "bg-red-50 border border-red-200"
                            : "bg-secondary/10"
                        }`}>
                          <span className="text-xs text-muted-foreground">{tc("childrenPrefix")} </span>
                          <span className="font-semibold">
                            {classe._count?.enfants ?? 0} / {classe.capacite}
                          </span>
                          {classe._count && classe._count.enfants >= classe.capacite && (
                            <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200 font-semibold">{tc("fullBadge")}</span>
                          )}
                        </div>
                      )}
                      {classe.capacite == null && classe._count != null && (
                        <div className="p-2 px-3 bg-secondary/10 rounded-lg text-sm">
                          <span className="text-xs text-muted-foreground">{tc("childrenPrefix")} </span>
                          <span className="font-semibold">{classe._count.enfants}</span>
                        </div>
                      )}
                    </div>

                    {/* Teachers section */}
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          {tc("teachersAssigned")}
                          {assignedTeachers.length > 0 && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {assignedTeachers.length}
                            </Badge>
                          )}
                        </h4>
                        {availableTeachers.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs h-7"
                            onClick={() => {
                              setAssigningClassId(isAssigning ? null : classe.id);
                              setSelectedTeacherId("");
                              setAssignError(null);
                            }}
                          >
                            <UserPlus className="w-3 h-3" />
                            {isAssigning ? "Annuler" : "Ajouter"}
                          </Button>
                        )}
                      </div>

                      {/* Current teachers list */}
                      {assignedTeachers.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          {tc("emptyTeachersInClass")}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {assignedTeachers.map((ec) => (
                            <div
                              key={ec.enseignant.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-full text-sm"
                            >
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {ec.enseignant.utilisateur.prenom[0]}
                                {ec.enseignant.utilisateur.nom[0]}
                              </div>
                              <span className="font-medium">
                                {ec.enseignant.utilisateur.prenom} {ec.enseignant.utilisateur.nom}
                              </span>
                              <span className="text-muted-foreground text-xs hidden sm:inline">
                                · {ec.enseignant.utilisateur.email}
                              </span>
                              <button
                                onClick={() =>
                                  setUnassignTarget({ classeId: classe.id, enseignantId: ec.enseignant.id })
                                }
                                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                title={tc("removeTitle")}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Assignment form */}
                      {isAssigning && (
                        <div className="flex gap-2 mt-2">
                          <select
                            value={selectedTeacherId}
                            onChange={(e) => setSelectedTeacherId(e.target.value)}
                            className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                          >
                            <option value="">{tc("selectTeacherDash")}</option>
                            {availableTeachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.prenom} {teacher.nom} · {teacher.email}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground"
                            disabled={!selectedTeacherId || assignLoading}
                            onClick={() => handleAssignTeacher(classe.id)}
                          >
                            {assignLoading ? tc("assigningShort") : tc("assignButton")}
                          </Button>
                        </div>
                      )}
                      {isAssigning && assignError && (
                        <p className="text-xs text-destructive mt-1">{assignError}</p>
                      )}
                      {availableTeachers.length === 0 && assignedTeachers.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {tc("allTeachersAssigned")}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </AdminMainContent>

      <SimpleConfirmDialog
        open={Boolean(deleteClassId)}
        title={tc("deleteConfirm")}
        confirmLabel={tc("remove")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        pending={deletePending}
        onCancel={() => {
          if (!deletePending) setDeleteClassId(null);
        }}
        onConfirm={confirmDeleteClass}
      />
      <SimpleConfirmDialog
        open={Boolean(unassignTarget)}
        title={tc("unassignConfirm")}
        confirmLabel={tc("removeTitle")}
        cancelLabel={tc("cancel")}
        variant="destructive"
        pending={unassignPending}
        onCancel={() => {
          if (!unassignPending) setUnassignTarget(null);
        }}
        onConfirm={confirmUnassignTeacher}
      />
    </div>
  );
}
