"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCircle,
  Mail,
  Phone,
  Globe,
  Calendar,
  Bell,
  GraduationCap,
  BookOpen,
  Users,
  Baby,
  Shield,
  Pencil,
  MapPin,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenaPhoneInput } from "@/components/ui/mena-phone-input";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { ProfileField, ProfileSectionTitle } from "@/components/admin/profile-field";
import { apiClient } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import { ROLE_BADGE_VARIANT, USER_STATUS_BADGE_VARIANT } from "@/lib/design/status-badges";
import { formatAgeFromBirthdate } from "@/lib/child-age-policy";
import {
  formatChildAllergies,
  formatClassTeachers,
  formatClassTeachersFromClasse,
  formatClasseLabel,
  formatUserStatut,
  resolveChildPhoto,
  resolveClasseLabelById,
  resolveDesiredClasseId,
  resolveDisplayPhone,
  resolveFamilleResidence,
  resolveInscriptionPayload,
  resolvePayloadTuteur,
  resolveUserAddress,
  pickString,
  type ClasseOption,
} from "@/lib/admin/user-profile";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Briefcase, StickyNote, ImageIcon } from "lucide-react";

function resolveProfession(payloadTuteur: Record<string, unknown> | null): string | null {
  if (!payloadTuteur) return null;
  const code = pickString(payloadTuteur.profession);
  if (code === "other" || code === "Autre") return pickString(payloadTuteur.professionOther);
  return code;
}

type AssignedClass = {
  classe: {
    id: string;
    nom: string;
    niveau?: string | null;
  };
};

type UserProfile = {
  id: string;
  email: string;
  telephone?: string | null;
  notesAdmin?: string | null;
  prenom: string;
  nom: string;
  langue?: string | null;
  role: string;
  statut: string;
  emailNotificationsEnabled?: boolean;
  creeLe?: string | null;
  modifieLe?: string | null;
  enseignant?: {
    id: string;
    fonction?: string | null;
    specialite?: string | null;
    classes?: AssignedClass[];
  } | null;
  tuteur?: {
    id: string;
    familleId: string;
    lien?: string | null;
    prenom?: string | null;
    nom?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    email?: string | null;
    principal?: boolean | null;
    famille?: {
      id: string;
      emailPrincipal?: string | null;
      languePreferee?: string | null;
      adresseFacturation?: string | null;
      inscriptions?: Array<{
        id: string;
        enfantId?: string | null;
        statut?: string;
        payload?: unknown;
        createdAt?: string;
      }>;
      enfants?: Array<{
        id: string;
        prenom: string;
        nom: string;
        dateNaissance?: string | null;
        genre?: string | null;
        photoUrl?: string | null;
        intolerances?: string[];
        sansRestriction?: boolean | null;
        remarques?: string | null;
        classeId?: string | null;
        profilSante?: {
          tags?: string[];
          allergies?: Array<{
            id: string;
            nom: string;
            severite?: string | null;
            notes?: string | null;
          }>;
          intolerances?: Array<{
            id: string;
            nom: string;
            notes?: string | null;
          }>;
        } | null;
        classe?: {
          id: string;
          nom: string;
          niveau?: string | null;
          enseignants?: ClasseOption["enseignants"];
        } | null;
        inscriptions?: Array<{ payload?: unknown }>;
      }>;
      tuteurs?: Array<{
        id: string;
        lien?: string | null;
        prenom?: string | null;
        nom?: string | null;
        telephone?: string | null;
        adresse?: string | null;
        email?: string | null;
        principal?: boolean | null;
        utilisateur?: {
          id: string;
          telephone?: string | null;
          email?: string | null;
          statut?: string | null;
        } | null;
      }>;
    };
  };
};

const FONCTIONS = [
  "Éducateur(trice) de jeunes enfants",
  "Auxiliaire de puériculture",
  "Psychomotricien(ne)",
  "Orthophoniste",
  "Animateur(trice)",
  "Référent(e) pédagogique",
  "Directeur(trice) adjoint(e)",
  "Autre",
];

const LIEN_LABELS: Record<string, string> = {
  Mere: "Mère",
  Pere: "Père",
  Tuteur: "Tuteur/Tutrice",
  GrandMere: "Grand-mère",
  GrandPere: "Grand-père",
  Autre: "Autre",
};

function formatLien(lien?: string | null): string {
  if (!lien) return "—";
  return LIEN_LABELS[lien] ?? lien;
}

function formatLangue(langue?: string | null): string {
  if (langue === "fr") return "Français";
  if (langue === "ar") return "Arabe";
  return langue?.toUpperCase() ?? "—";
}

function formatGenre(genre?: string | null): string {
  if (genre === "M") return "Masculin";
  if (genre === "F") return "Féminin";
  return genre ?? "—";
}

export default function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClasseOption[]>([]);
  const [childClassSavingId, setChildClassSavingId] = useState<string | null>(null);
  const [childNotesSavingId, setChildNotesSavingId] = useState<string | null>(null);
  const [childNotesDraft, setChildNotesDraft] = useState<Record<string, string>>({});
  const [childSaveError, setChildSaveError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    fonction: "",
    specialite: "",
    notesAdmin: "",
  });

  const resolved = use(params);
  const currentLocale = resolved.locale;
  const userId = resolved.id;

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const res = await apiClient.listClasses();
        const data = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        if (!cancelled) setClasses(data as ClasseOption[]);
      } catch (e) {
        console.error("[Admin/UserProfile] classes load error", e);
      }
    }

    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.getAdminUser(userId);
        const payload = res.data as UserProfile;

        if (!cancelled) {
          setProfile(payload);
          setEditForm({
            prenom: payload.prenom ?? "",
            nom: payload.nom ?? "",
            telephone: resolveDisplayPhone(payload.telephone, payload.tuteur?.telephone) ?? "",
            fonction: payload.enseignant?.fonction ?? "",
            specialite: payload.enseignant?.specialite ?? "",
            notesAdmin: payload.notesAdmin ?? "",
          });
          const drafts: Record<string, string> = {};
          for (const enfant of payload.tuteur?.famille?.enfants ?? []) {
            drafts[enfant.id] = enfant.remarques ?? "";
          }
          setChildNotesDraft(drafts);
        }
      } catch (e) {
        console.error("[Admin/UserProfile] load error", e);
        if (!cancelled) setError("Impossible de charger le profil utilisateur.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString(currentLocale === "ar" ? "ar-MA" : currentLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return value;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiClient.updateUserProfile(userId, {
        prenom: editForm.prenom || undefined,
        nom: editForm.nom || undefined,
        telephone: editForm.telephone || undefined,
        fonction: editForm.fonction || undefined,
        specialite: editForm.specialite || undefined,
        notesAdmin: editForm.notesAdmin,
      });
      setProfile(res.data as UserProfile);
      setEditing(false);
    } catch (e: unknown) {
      console.error("[Admin/UserProfile] save error", e);
      const ax = e as { response?: { data?: { message?: string } } };
      setSaveError(ax?.response?.data?.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setSaveError(null);
    try {
      const res = await apiClient.updateUserProfile(userId, {
        notesAdmin: editForm.notesAdmin,
      });
      setProfile(res.data as UserProfile);
      setEditingNotes(false);
    } catch (e: unknown) {
      console.error("[Admin/UserProfile] notes save error", e);
      const ax = e as { response?: { data?: { message?: string } } };
      setSaveError(ax?.response?.data?.message ?? "Erreur lors de la sauvegarde des notes.");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    if (!profile) return;
    setNotificationSaving(true);
    setNotificationError(null);
    try {
      await apiClient.updateUserEmailNotifications(userId, enabled);
      setProfile((prev) => (prev ? { ...prev, emailNotificationsEnabled: enabled } : prev));
    } catch (e: unknown) {
      console.error("[Admin/UserProfile] email notifications toggle error", e);
      const ax = e as { response?: { data?: { message?: string } } };
      setNotificationError(
        ax?.response?.data?.message ?? "Impossible de mettre à jour la préférence de notification.",
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  const patchEnfantInProfile = (enfantId: string, patch: Record<string, unknown>) => {
    setProfile((prev) => {
      if (!prev?.tuteur?.famille?.enfants) return prev;
      return {
        ...prev,
        tuteur: {
          ...prev.tuteur,
          famille: {
            ...prev.tuteur.famille,
            enfants: prev.tuteur.famille.enfants.map((e) =>
              e.id === enfantId ? { ...e, ...patch } : e,
            ),
          },
        },
      };
    });
  };

  const handleChildClassChange = async (enfantId: string, nextClasseId: string) => {
    setChildClassSavingId(enfantId);
    setChildSaveError(null);
    try {
      await apiClient.updateChild(enfantId, { classeId: nextClasseId || null });
      const selected = classes.find((c) => c.id === nextClasseId);
      patchEnfantInProfile(enfantId, {
        classeId: nextClasseId || null,
        classe: selected
          ? {
              id: selected.id,
              nom: selected.nom,
              niveau: selected.niveau ?? null,
              enseignants: selected.enseignants,
            }
          : null,
      });
      notifySuccess("Classe mise à jour.");
    } catch (e: unknown) {
      console.error("[Admin/UserProfile] child class save error", e);
      setChildSaveError(getApiErrorMessage(e, "Impossible de modifier la classe."));
      notifyError(getApiErrorMessage(e, "Impossible de modifier la classe."));
    } finally {
      setChildClassSavingId(null);
    }
  };

  const handleChildNotesSave = async (enfantId: string) => {
    setChildNotesSavingId(enfantId);
    setChildSaveError(null);
    try {
      const remarques = childNotesDraft[enfantId]?.trim() ?? "";
      await apiClient.updateChild(enfantId, { remarques: remarques || null });
      patchEnfantInProfile(enfantId, { remarques: remarques || null });
      notifySuccess("Notes enfant enregistrées.");
    } catch (e: unknown) {
      console.error("[Admin/UserProfile] child notes save error", e);
      setChildSaveError(getApiErrorMessage(e, "Impossible d'enregistrer les notes."));
      notifyError(getApiErrorMessage(e, "Impossible d'enregistrer les notes."));
    } finally {
      setChildNotesSavingId(null);
    }
  };

  const syncTeacherEditForm = () => {
    if (!profile) return;
    setEditForm({
      prenom: profile.prenom ?? "",
      nom: profile.nom ?? "",
      telephone: resolveDisplayPhone(profile.telephone, profile.tuteur?.telephone) ?? "",
      fonction: profile.enseignant?.fonction ?? "",
      specialite: profile.enseignant?.specialite ?? "",
      notesAdmin: profile.notesAdmin ?? "",
    });
  };

  const displayPhone = profile
    ? resolveDisplayPhone(profile.telephone, profile.tuteur?.telephone)
    : null;

  const familleInscriptions = profile?.tuteur?.famille?.inscriptions;
  const famillePayload =
    profile?.role === "PARENT"
      ? resolveInscriptionPayload(undefined, familleInscriptions)
      : null;
  const ownPayloadTuteur =
    profile?.tuteur && profile.role === "PARENT" && famillePayload
      ? resolvePayloadTuteur(famillePayload, profile.tuteur)
      : null;
  const userAddress =
    profile?.role === "PARENT"
      ? resolveUserAddress(profile.tuteur?.adresse, ownPayloadTuteur?.adresse as string | undefined)
      : null;
  const familleResidence = resolveFamilleResidence(famillePayload, currentLocale);

  const roleBadgeVariant = (role: string) => ROLE_BADGE_VARIANT[role] ?? "neutral";
  const statutBadgeVariant = (statut: string) => USER_STATUS_BADGE_VARIANT[statut] ?? "neutral";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-[var(--status-progress-text)]" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Profil utilisateur</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Détails du compte et informations associées
                </p>
              </div>
            </div>
            <Link href={`/${currentLocale}/admin/utilisateurs`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Retour
              </Button>
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !profile ? (
            <p className="text-sm text-muted-foreground">Profil introuvable.</p>
          ) : (
            <div className="space-y-6">
              <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center text-lg font-bold text-foreground flex-shrink-0">
                      {(profile.prenom?.[0] ?? "?").toUpperCase()}
                      {(profile.nom?.[0] ?? "").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-semibold text-foreground truncate">
                        {profile.prenom} {profile.nom}
                      </p>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={roleBadgeVariant(profile.role)} className="uppercase">
                      {profile.role}
                    </Badge>
                    <Badge variant={statutBadgeVariant(profile.statut)} className="uppercase" title={profile.statut}>
                      {formatUserStatut(profile.statut)}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/20 border border-border/60 px-4">
                  <ProfileField icon={Phone} label="Téléphone" value={displayPhone} />
                  {profile.role === "PARENT" ? (
                    <>
                      <ProfileField icon={CreditCard} label="CIN" value={pickString(ownPayloadTuteur?.cin)} />
                      <ProfileField icon={Briefcase} label="Profession" value={resolveProfession(ownPayloadTuteur)} />
                    </>
                  ) : null}
                  <ProfileField icon={Globe} label="Langue" value={formatLangue(profile.langue)} />
                  <ProfileField icon={Calendar} label="Créé le" value={formatDate(profile.creeLe)} />
                  <ProfileField icon={Calendar} label="Modifié le" value={formatDate(profile.modifieLe)} />
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-muted/10 p-4">
                  <ProfileSectionTitle
                    icon={StickyNote}
                    action={
                      !editingNotes ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-xl"
                          onClick={() => {
                            setEditingNotes(true);
                            setEditForm((p) => ({ ...p, notesAdmin: profile.notesAdmin ?? "" }));
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden />
                          {profile.notesAdmin ? "Modifier" : "Ajouter"}
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-xl" onClick={() => void handleSaveNotes()} disabled={notesSaving}>
                            {notesSaving ? "Enregistrement…" : "Enregistrer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setEditingNotes(false);
                              setEditForm((p) => ({ ...p, notesAdmin: profile.notesAdmin ?? "" }));
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      )
                    }
                  >
                    Notes admin
                  </ProfileSectionTitle>
                  {editingNotes ? (
                    <Textarea
                      value={editForm.notesAdmin}
                      onChange={(e) => setEditForm((p) => ({ ...p, notesAdmin: e.target.value }))}
                      placeholder="Note interne visible uniquement par les administrateurs…"
                      rows={4}
                      className="rounded-xl text-sm"
                    />
                  ) : (
                    <p className={`text-sm whitespace-pre-line ${profile.notesAdmin ? "text-foreground" : "text-muted-foreground italic"}`}>
                      {profile.notesAdmin?.trim() || "Aucune note pour cet utilisateur."}
                    </p>
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-muted/10 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Notifications email</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Présence, événements et autres alertes par email
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.emailNotificationsEnabled ?? true}
                        disabled={notificationSaving}
                        onChange={(e) => void handleToggleEmailNotifications(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-[var(--status-progress-text)] focus:ring-[var(--status-progress-border)]"
                      />
                      <span className="font-medium text-foreground">
                        {profile.emailNotificationsEnabled ?? true ? "Activées" : "Désactivées"}
                      </span>
                    </label>
                  </div>
                  {notificationError ? (
                    <p className="text-xs text-destructive mt-2">{notificationError}</p>
                  ) : null}
                  {profile.role !== "PARENT" ? (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Option surtout utile pour les comptes parent.
                    </p>
                  ) : null}
                </div>
              </Card>

              {profile.role === "ENSEIGNANT" && (
                <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
                  <ProfileSectionTitle
                    icon={GraduationCap}
                    action={
                      !editing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 rounded-xl"
                          onClick={() => {
                            syncTeacherEditForm();
                            setEditing(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden />
                          Modifier
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-xl" onClick={() => void handleSave()} disabled={saving}>
                            {saving ? "Enregistrement…" : "Enregistrer"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setEditing(false);
                              setSaveError(null);
                              syncTeacherEditForm();
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      )
                    }
                  >
                    Profil enseignant
                  </ProfileSectionTitle>

                  {saveError ? <p className="text-sm text-destructive mb-3">{saveError}</p> : null}

                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Prénom</label>
                        <Input
                          value={editForm.prenom}
                          onChange={(e) => setEditForm((p) => ({ ...p, prenom: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nom</label>
                        <Input
                          value={editForm.nom}
                          onChange={(e) => setEditForm((p) => ({ ...p, nom: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Téléphone</label>
                        <MenaPhoneInput
                          value={editForm.telephone}
                          onChange={(telephone) => setEditForm((p) => ({ ...p, telephone }))}
                          inputClassName="rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Fonction</label>
                        <select
                          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                          value={editForm.fonction}
                          onChange={(e) => setEditForm((p) => ({ ...p, fonction: e.target.value }))}
                        >
                          <option value="">— Sélectionner —</option>
                          {FONCTIONS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Spécialité</label>
                        <Input
                          value={editForm.specialite}
                          onChange={(e) => setEditForm((p) => ({ ...p, specialite: e.target.value }))}
                          placeholder="Ex : Anglais, Art plastique…"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-muted/20 border border-border/60 px-4">
                      <ProfileField label="Fonction" value={profile.enseignant?.fonction} />
                      <ProfileField label="Spécialité" value={profile.enseignant?.specialite} />
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-border/60">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden />
                      Classes assignées
                    </p>
                    {profile.enseignant?.classes && profile.enseignant.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.enseignant.classes.map((ec) => (
                          <Badge key={ec.classe.id} variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
                            {ec.classe.nom}
                            {ec.classe.niveau ? (
                              <span className="opacity-70">· {ec.classe.niveau}</span>
                            ) : null}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune classe assignée.{" "}
                        <Link
                          href={`/${currentLocale}/admin/classes`}
                          className="text-foreground underline underline-offset-2 hover:opacity-80"
                        >
                          Gérer les classes
                        </Link>
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {profile.role === "PARENT" && (
                <>
                  <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
                    <ProfileSectionTitle icon={Users}>Famille</ProfileSectionTitle>
                    <div className="rounded-xl bg-muted/20 border border-border/60 px-4 mb-6">
                      <ProfileField icon={Mail} label="Email principal" value={profile.tuteur?.famille?.emailPrincipal} />
                      <ProfileField
                        icon={MapPin}
                        label="Adresse de facturation"
                        value={profile.tuteur?.famille?.adresseFacturation}
                        multiline
                      />
                      <ProfileField
                        icon={MapPin}
                        label="Adresse de résidence"
                        value={familleResidence.adresse}
                        multiline
                      />
                      <ProfileField icon={Globe} label="Langue préférée" value={formatLangue(profile.tuteur?.famille?.languePreferee)} />
                    </div>

                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tuteurs</p>
                    {profile.tuteur?.famille?.tuteurs && profile.tuteur.famille.tuteurs.length > 0 ? (
                      <div className="space-y-3">
                        {profile.tuteur.famille.tuteurs.map((t) => {
                          const payloadTuteur = famillePayload
                            ? resolvePayloadTuteur(famillePayload, t)
                            : null;
                          const phone = resolveDisplayPhone(t.telephone, t.utilisateur?.telephone);
                          const profession = resolveProfession(payloadTuteur);
                          const cin = pickString(payloadTuteur?.cin);
                          const adresse = resolveUserAddress(t.adresse, payloadTuteur?.adresse as string | undefined);

                          return (
                          <div key={t.id} className="rounded-xl border border-border/80 bg-background p-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                              <p className="font-semibold text-foreground">
                                {`${t.prenom ?? ""} ${t.nom ?? ""}`.trim() || "—"}
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {t.lien ? (
                                  <Badge variant="outline" className="text-xs">{formatLien(t.lien)}</Badge>
                                ) : null}
                                {t.principal ? <Badge variant="accepted" className="text-xs">Principal</Badge> : null}
                              </div>
                            </div>
                            <div className="rounded-lg bg-muted/20 px-3">
                              <ProfileField icon={Mail} label="Email" value={t.email ?? t.utilisateur?.email} />
                              <ProfileField icon={Phone} label="Téléphone" value={phone} />
                              <ProfileField icon={MapPin} label="Adresse" value={adresse ?? undefined} multiline />
                              <ProfileField icon={Briefcase} label="Profession" value={profession ?? undefined} />
                              <ProfileField icon={CreditCard} label="CIN" value={cin ?? undefined} />
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun tuteur.</p>
                    )}
                  </Card>

                  <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
                    <ProfileSectionTitle icon={Baby}>Enfants</ProfileSectionTitle>
                    {childSaveError ? (
                      <p className="text-sm text-destructive mb-3">{childSaveError}</p>
                    ) : null}
                    {profile.tuteur?.famille?.enfants && profile.tuteur.famille.enfants.length > 0 ? (
                      <div className="space-y-3">
                        {profile.tuteur.famille.enfants.map((e) => {
                          const birthIso = e.dateNaissance?.slice(0, 10);
                          const ageLabel = birthIso ? formatAgeFromBirthdate(birthIso) : null;
                          const allergiesLabel = formatChildAllergies(e, familleInscriptions);
                          const photoSrc = resolveChildPhoto(e, familleInscriptions);
                          const assignedClasseId = e.classeId ?? e.classe?.id ?? "";
                          const assignedClasseLabel = formatClasseLabel(e.classe);
                          const desiredClasseId = resolveDesiredClasseId(e, familleInscriptions, famillePayload);
                          const desiredClasseLabel = resolveClasseLabelById(desiredClasseId, classes);
                          const teachersLabel =
                            formatClassTeachersFromClasse(e.classe) ??
                            formatClassTeachers(assignedClasseId, classes);
                          const notesDraft = childNotesDraft[e.id] ?? e.remarques ?? "";
                          const notesDirty = notesDraft.trim() !== (e.remarques?.trim() ?? "");

                          return (
                            <div key={e.id} className="rounded-xl border border-border/80 bg-background p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                                <Link
                                  href={`/${currentLocale}/admin/enfants/${e.id}`}
                                  className="flex items-center gap-3 min-w-0 group"
                                >
                                  {photoSrc ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={photoSrc}
                                      alt={`Photo de ${e.prenom} ${e.nom}`}
                                      className="w-12 h-12 rounded-lg object-cover border border-border bg-muted shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center shrink-0">
                                      <ImageIcon className="w-5 h-5 text-muted-foreground/50" aria-hidden />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground group-hover:underline underline-offset-2 truncate">
                                      {e.prenom} {e.nom}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                      Voir la fiche enfant
                                    </p>
                                  </div>
                                </Link>
                                {assignedClasseLabel ? (
                                  <Badge variant="outline" className="text-xs shrink-0">{assignedClasseLabel}</Badge>
                                ) : desiredClasseLabel ? (
                                  <Badge variant="neutral" className="text-xs shrink-0" title="Classe demandée à l'inscription">
                                    Souhaitée : {desiredClasseLabel}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="neutral"
                                    className="text-xs shrink-0"
                                    title="L'enfant n'est pas encore assigné à une classe"
                                  >
                                    Sans classe
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                    Classe assignée
                                  </label>
                                  <select
                                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                                    value={assignedClasseId}
                                    disabled={childClassSavingId === e.id}
                                    onChange={(ev) => void handleChildClassChange(e.id, ev.target.value)}
                                  >
                                    <option value="">— Sans classe —</option>
                                    {classes.map((cl) => (
                                      <option key={cl.id} value={cl.id}>
                                        {formatClasseLabel(cl) ?? cl.nom}
                                      </option>
                                    ))}
                                  </select>
                                  {childClassSavingId === e.id ? (
                                    <p className="text-[11px] text-muted-foreground mt-1">Mise à jour…</p>
                                  ) : null}
                                </div>
                                <div>
                                  <ProfileField
                                    icon={GraduationCap}
                                    label="Enseignant(s)"
                                    value={teachersLabel ?? (assignedClasseId ? "Aucun enseignant assigné" : null)}
                                  />
                                </div>
                              </div>

                              {!assignedClasseId && desiredClasseLabel ? (
                                <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 px-3 mb-4">
                                  <ProfileField
                                    icon={BookOpen}
                                    label="Classe souhaitée (inscription)"
                                    value={desiredClasseLabel}
                                  />
                                </div>
                              ) : null}

                              <div className="rounded-xl border border-border/60 bg-muted/10 p-3 mb-4">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Notes admin (enfant)
                                </label>
                                <Textarea
                                  value={notesDraft}
                                  onChange={(ev) =>
                                    setChildNotesDraft((prev) => ({ ...prev, [e.id]: ev.target.value }))
                                  }
                                  placeholder="Notes internes sur cet enfant…"
                                  rows={3}
                                  className="rounded-xl text-sm mb-2"
                                />
                                <Button
                                  size="sm"
                                  className="rounded-xl"
                                  disabled={childNotesSavingId === e.id || !notesDirty}
                                  onClick={() => void handleChildNotesSave(e.id)}
                                >
                                  {childNotesSavingId === e.id ? "Enregistrement…" : "Enregistrer les notes"}
                                </Button>
                              </div>

                              <div className="rounded-lg bg-muted/20 px-3">
                                <ProfileField
                                  icon={Calendar}
                                  label="Naissance"
                                  value={
                                    birthIso
                                      ? new Date(`${birthIso}T12:00:00`).toLocaleDateString(
                                          currentLocale === "ar" ? "ar-MA" : currentLocale,
                                        )
                                      : null
                                  }
                                />
                                <ProfileField label="Âge" value={ageLabel} />
                                <ProfileField label="Genre" value={formatGenre(e.genre)} />
                                <ProfileField label="Allergies / intolérances" value={allergiesLabel} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun enfant.</p>
                    )}
                  </Card>
                </>
              )}

              {profile.role === "ADMIN" && (
                <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
                  <ProfileSectionTitle icon={Shield}>Administrateur</ProfileSectionTitle>
                  <p className="text-sm text-muted-foreground">
                    Compte administrateur avec accès complet à la plateforme.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </AdminMainContent>
    </div>
  );
}
