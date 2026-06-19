"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenaPhoneInput } from "@/components/ui/mena-phone-input";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import { EnfantProfileView } from "@/components/admin/enfant-profile-view";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { resolveChildPhoto } from "@/lib/admin/user-profile";
import { Pencil, X, Plus, Trash2, Save, ChevronLeft, Users, BookOpen, UserCheck, Phone, IdCard } from "lucide-react";

export default function EnfantDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const resolvedParams = use(params);
  const { locale, id } = resolvedParams;
  const t = useTranslations("admin.children");
  const tp = useTranslations("admin.children.profile");

  const [enfant, setEnfant] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    prenom: "", nom: "", genre: "", classeId: "", photoUrl: "", remarques: "",
  });
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [showDelForm, setShowDelForm] = useState(false);
  const [delForm, setDelForm] = useState({ nom: "", telephone: "", cin: "", relation: "" });
  const [delSaving, setDelSaving] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [deleteDelegationId, setDeleteDelegationId] = useState<string | null>(null);
  const [deleteDelegationPending, setDeleteDelegationPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [childRes, classesRes] = await Promise.all([
          apiClient.getChild(id),
          apiClient.listClasses(),
        ]);
        if (!cancelled) {
          setEnfant(childRes.data);
          setClasses(Array.isArray(classesRes.data) ? classesRes.data : classesRes.data?.data ?? []);
        }
      } catch {
        if (!cancelled) setError(tp("notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, tp]);

  const openEdit = () => {
    if (!enfant) return;
    const familleInscriptions = enfant.famille?.inscriptions;
    setEditForm({
      prenom: enfant.prenom ?? "",
      nom: enfant.nom ?? "",
      genre: enfant.genre ?? "",
      classeId: enfant.classeId ?? enfant.classe?.id ?? "",
      photoUrl:
        resolveChildPhoto(
          { photoUrl: enfant.photoUrl, inscriptions: enfant.inscriptions },
          familleInscriptions,
        ) ?? "",
      remarques: enfant.remarques ?? "",
    });
    setEditErr(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    setEditErr(null);
    try {
      const res = await apiClient.updateChild(id, {
        prenom: editForm.prenom || undefined,
        nom: editForm.nom || undefined,
        genre: editForm.genre || undefined,
        classeId: editForm.classeId || null,
        photoUrl: editForm.photoUrl || null,
        remarques: editForm.remarques || null,
      });
      setEnfant((prev: any) => ({ ...prev, ...res.data }));
      setEditing(false);
    } catch {
      setEditErr("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const addDelegation = async () => {
    if (!delForm.nom.trim()) {
      setDelErr(tp("delegations.fullNameRequired"));
      return;
    }
    setDelSaving(true);
    setDelErr(null);
    try {
      const res = await apiClient.addDelegation(id, delForm);
      setEnfant((prev: any) => ({ ...prev, delegations: [...(prev.delegations ?? []), res.data] }));
      setDelForm({ nom: "", telephone: "", cin: "", relation: "" });
      setShowDelForm(false);
    } catch {
      setDelErr(tp("delegations.saveError"));
    } finally {
      setDelSaving(false);
    }
  };

  const confirmRemoveDelegation = async () => {
    if (!deleteDelegationId) return;
    try {
      setDeleteDelegationPending(true);
      await apiClient.deleteDelegation(id, deleteDelegationId);
      setEnfant((prev: any) => ({
        ...prev,
        delegations: prev.delegations.filter((d: any) => d.id !== deleteDelegationId),
      }));
      notifySuccess(tp("delegations.deleteSuccess"));
      setDeleteDelegationId(null);
    } catch (err) {
      notifyError(getApiErrorMessage(err, "Erreur lors de la suppression."));
    } finally {
      setDeleteDelegationPending(false);
    }
  };

  if (loading) {
    return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />
      <AdminMainContent className="flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">{tp("loading")}</p>
        </div>
      </AdminMainContent>
    </div>
  );
  }

  if (error || !enfant) {
    return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />
      <AdminMainContent className="flex items-center justify-center pt-16 md:pt-0 p-4">
          <p className="text-destructive text-sm text-center">{error ?? tp("notFound")}</p>
      </AdminMainContent>
    </div>
  );
  }

  const fullName = `${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim();
  const group = enfant.classe?.nom ?? "—";
  const delegations: any[] = Array.isArray(enfant.delegations) ? enfant.delegations : [];

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
      <SidebarNew currentLocale={locale} />

      <AdminMainContent className="pt-16 md:pt-0">
        <div className="sticky top-16 md:top-0 z-30 bg-white/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            type="button"
            onClick={() => history.back()}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            aria-label={t("backToList")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{fullName}</h1>
            <p className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-600" aria-hidden />
              {group}
            </p>
          </div>
          <Button size="sm" onClick={openEdit} className="flex items-center gap-1.5 flex-shrink-0 rounded-xl">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("edit")}</span>
          </Button>
        </div>

        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
          <EnfantProfileView enfant={enfant} classes={classes} locale={locale} />

          {/* Delegation management (admin CRUD) */}
          <Card className="overflow-hidden border border-border/80 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border/60 bg-muted/20">
              <h2 className="flex items-center gap-3 text-sm font-semibold text-foreground">
                <span className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                  <UserCheck className="h-4 w-4 text-violet-700" aria-hidden />
                </span>
                {tp("delegations.title")}
              </h2>
              <Button size="sm" onClick={() => { setShowDelForm(true); setDelErr(null); }} className="flex items-center gap-1.5 rounded-xl">
                <Plus className="w-3.5 h-3.5" /> {tp("delegations.add")}
              </Button>
            </div>

            <div className="p-4 sm:p-5">

            {showDelForm && (
              <div className="mb-4 p-4 border border-border rounded-xl bg-muted/20 space-y-3">
                <p className="text-sm font-semibold">{tp("delegations.addTitle")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tp("delegations.fullName")} *</label>
                    <Input value={delForm.nom} onChange={(e) => setDelForm((p) => ({ ...p, nom: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tp("fields.phone")}</label>
                    <MenaPhoneInput value={delForm.telephone} onChange={(telephone) => setDelForm((p) => ({ ...p, telephone }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tp("fields.cin")}</label>
                    <Input value={delForm.cin} onChange={(e) => setDelForm((p) => ({ ...p, cin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tp("fields.relationship")}</label>
                    <Input value={delForm.relation} onChange={(e) => setDelForm((p) => ({ ...p, relation: e.target.value }))} />
                  </div>
                </div>
                {delErr && <p className="text-xs text-destructive">{delErr}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={addDelegation} disabled={delSaving}>{delSaving ? "…" : tp("delegations.add")}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDelForm(false)}>{t("cancel")}</Button>
                </div>
              </div>
            )}

            {delegations.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 italic">{tp("emptyValue")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {delegations.map((d: any) => (
                  <div key={d.id} className="p-3.5 rounded-xl border border-border/80 bg-muted/10 flex justify-between items-start gap-2">
                    <div className="text-sm min-w-0 space-y-1">
                      <p className="font-semibold text-foreground break-words">{d.nom}</p>
                      {d.relation && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Users className="w-3 h-3 shrink-0" aria-hidden />
                          {d.relation}
                        </p>
                      )}
                      {d.telephone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3 shrink-0" aria-hidden />
                          {d.telephone}
                        </p>
                      )}
                      {d.cin && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <IdCard className="w-3 h-3 shrink-0" aria-hidden />
                          {d.cin}
                        </p>
                      )}
                    </div>
                    <button type="button" onClick={() => setDeleteDelegationId(d.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          </Card>
        </div>
      </AdminMainContent>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
              <div>
                <h2 className="font-bold text-base">{t("editTitle", { name: fullName })}</h2>
              </div>
              <button type="button" onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("form.firstName")}</label>
                  <Input value={editForm.prenom} onChange={(e) => setEditForm((p) => ({ ...p, prenom: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("form.lastName")}</label>
                  <Input value={editForm.nom} onChange={(e) => setEditForm((p) => ({ ...p, nom: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("form.gender")}</label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={editForm.genre}
                  onChange={(e) => setEditForm((p) => ({ ...p, genre: e.target.value }))}
                >
                  <option value="">{t("form.genderUnset")}</option>
                  <option value="M">{t("form.boy")}</option>
                  <option value="F">{t("form.girl")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("form.class")}</label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                  value={editForm.classeId}
                  onChange={(e) => setEditForm((p) => ({ ...p, classeId: e.target.value }))}
                >
                  <option value="">{t("noClass")}</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nom}{c.niveau ? ` (${c.niveau})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      notifyError("Image trop grande (max 5 Mo)");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setEditForm((p) => ({ ...p, photoUrl: reader.result as string }));
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary cursor-pointer"
                />
                {editForm.photoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={editForm.photoUrl} alt="preview" className="w-14 h-14 rounded-xl object-cover border" />
                    <button type="button" onClick={() => setEditForm((p) => ({ ...p, photoUrl: "" }))} className="text-xs text-destructive hover:underline">Supprimer</button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">{t("form.remarks")}</label>
                <textarea
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={editForm.remarques}
                  onChange={(e) => setEditForm((p) => ({ ...p, remarques: e.target.value }))}
                  placeholder={t("form.remarksPh")}
                />
              </div>
              {editErr && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{editErr}</p>}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t bg-muted/20">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>{t("cancel")}</Button>
              <Button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5">
                <Save className="w-4 h-4" />{saving ? t("saving") : t("save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SimpleConfirmDialog
        open={Boolean(deleteDelegationId)}
        title={tp("delegations.deleteTitle")}
        confirmLabel={t("archiveConfirm")}
        cancelLabel={t("cancel")}
        variant="destructive"
        pending={deleteDelegationPending}
        onCancel={() => {
          if (!deleteDelegationPending) setDeleteDelegationId(null);
        }}
        onConfirm={confirmRemoveDelegation}
      />
    </div>
  );
}
