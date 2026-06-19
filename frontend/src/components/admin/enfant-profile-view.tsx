"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/config";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Baby,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Mail,
  MapPin,
  MessageSquare,
  NotebookPen,
  Phone,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buildEnfantProfile, type ProfileField, type ProfileTuteur } from "@/lib/admin/enfant-profile";
import { cn } from "@/lib/utils";

type ClasseOption = { id: string; nom: string; niveau?: string | null };

type EnfantProfileViewProps = {
  enfant: Record<string, unknown>;
  classes: ClasseOption[];
  locale: Locale;
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  fullName: UserRound,
  dateOfBirth: Calendar,
  age: Baby,
  gender: Users,
  birthCity: MapPin,
  nationality: Globe,
  currentAddress: Home,
  currentCity: MapPin,
  class: BookOpen,
  desiredClass: GraduationCap,
  siblingCount: Users,
  siblingRank: Users,
  height: Scale,
  weight: Scale,
  familyHistory: HeartPulse,
  surgicalInterventions: Stethoscope,
  doctor: Stethoscope,
  medicalNotes: NotebookPen,
  dietaryNotes: AlertTriangle,
  dietaryRestriction: AlertTriangle,
  familyEmail: Mail,
  familyLanguage: Globe,
  familySituation: Users,
  billingAddress: Home,
  registrationStatus: ClipboardList,
  registrationDate: Calendar,
  declarationHonneur: CheckCircle2,
  confirmationExacte: CheckCircle2,
  cin: IdCard,
  phone: Phone,
  email: Mail,
  address: MapPin,
  profession: ClipboardList,
  relationship: Users,
};

function SectionCard({
  title,
  icon: Icon,
  children,
  className,
  accent = "sky",
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  accent?: "sky" | "rose" | "amber" | "emerald" | "violet";
}) {
  const accentMap = {
    sky: "bg-slate-100 border-slate-300 text-slate-700",
    rose: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    emerald: "bg-[var(--status-accepted-bg)] border-[var(--status-accepted-border)] text-[var(--status-accepted-text)]",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };

  return (
    <Card className={cn("overflow-hidden border border-border/80 bg-white shadow-sm rounded-2xl", className)}>
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-border/60 bg-muted/20">
        <span
          className={cn(
            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
            accentMap[accent],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </Card>
  );
}

function SubsectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-1">
      {children}
    </p>
  );
}

function SchoolingHighlight({
  label,
  value,
  icon: Icon,
  emptyLabel,
  variant = "primary",
}: {
  label: string;
  value: string | null;
  icon: LucideIcon;
  emptyLabel: string;
  variant?: "primary" | "secondary";
}) {
  const isEmpty = !value?.trim();
  const display = isEmpty ? emptyLabel : value;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 px-4 py-3 min-w-0",
        variant === "primary"
          ? "border-slate-300 bg-white shadow-sm"
          : "border-amber-200 bg-amber-50/80",
      )}
    >
      <span
        className={cn(
          "w-10 h-10 rounded-lg border flex items-center justify-center shrink-0",
          variant === "primary"
            ? "bg-slate-100 border-slate-200 text-slate-700"
            : "bg-amber-100 border-amber-200 text-amber-800",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p
          className={cn(
            "text-base font-bold truncate",
            isEmpty && "text-sm font-normal italic text-slate-400",
            !isEmpty && variant === "primary" && "text-slate-900",
            !isEmpty && variant === "secondary" && "text-amber-950",
          )}
        >
          {display}
        </p>
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3 py-2.5 min-w-0">
      <Icon className="h-4 w-4 text-slate-600 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
  emptyLabel,
  multiline,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  emptyLabel: string;
  multiline?: boolean;
  highlight?: boolean;
}) {
  const isEmpty = !value?.trim();
  const display = isEmpty ? emptyLabel : value;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3 min-w-0",
        highlight ? "border-amber-200 bg-amber-50/50" : "border-border/70 bg-muted/10",
      )}
    >
      <span
        className={cn(
          "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0",
          highlight
            ? "bg-amber-100 border-amber-200 text-amber-800"
            : "bg-white border-border/80 text-muted-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">{label}</p>
        <p
          className={cn(
            "text-sm break-words",
            multiline && "whitespace-pre-line",
            isEmpty ? "italic text-muted-foreground/70" : "font-medium text-foreground",
          )}
        >
          {display}
        </p>
      </div>
    </div>
  );
}

function TagGroup({
  label,
  icon: Icon,
  items,
  emptyLabel,
  tone = "blue",
}: {
  label: string;
  icon: LucideIcon;
  items: string[];
  emptyLabel: string;
  tone?: "blue" | "red" | "orange" | "green";
}) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-800 border-sky-200",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    green: "pp-surface-success border",
  }[tone];

  return (
    <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        {label}
      </p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className={cn("px-2.5 py-1 text-xs rounded-full border font-medium", toneClass)}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/70 italic">{emptyLabel}</p>
      )}
    </div>
  );
}

function TuteurCard({
  tuteur,
  t,
  emptyLabel,
}: {
  tuteur: ProfileTuteur;
  t: ReturnType<typeof useTranslations>;
  emptyLabel: string;
}) {
  const fullName = `${tuteur.prenom} ${tuteur.nom}`.trim() || emptyLabel;
  const RoleIcon =
    tuteur.roleKey === "mother" ? UserRound : tuteur.roleKey === "father" ? UserRound : Users;

  return (
    <div className="rounded-xl border border-border/80 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <RoleIcon className="h-4 w-4 text-slate-600" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground break-words">{fullName}</p>
            <p className="text-xs text-muted-foreground">{t(`roles.${tuteur.roleKey}`)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          {tuteur.principal && (
            <Badge variant="accepted" className="text-[10px]">
              {t("badges.principal")}
            </Badge>
          )}
          {tuteur.archived && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
              {t("badges.archivedAccount")}
            </Badge>
          )}
          {tuteur.accountStatus && (
            <Badge variant="outline" className="text-[10px]">
              {t(`accountStatus.${tuteur.accountStatus}`)}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <InfoField icon={IdCard} label={t("fields.cin")} value={tuteur.cin} emptyLabel={emptyLabel} />
        <InfoField icon={Phone} label={t("fields.phone")} value={tuteur.telephone} emptyLabel={emptyLabel} />
        <InfoField icon={Mail} label={t("fields.email")} value={tuteur.email} emptyLabel={emptyLabel} />
        <InfoField icon={MapPin} label={t("fields.address")} value={tuteur.adresse} emptyLabel={emptyLabel} multiline />
        <InfoField
          icon={ClipboardList}
          label={t("fields.profession")}
          value={tuteur.profession}
          emptyLabel={emptyLabel}
        />
      </div>
    </div>
  );
}

function ContactCard({
  name,
  subtitle,
  phone,
  email,
  emptyLabel,
  extra,
}: {
  name: string;
  subtitle?: string | null;
  phone?: string | null;
  email?: string | null;
  emptyLabel: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-3.5 space-y-2">
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-white border border-border/80 flex items-center justify-center shrink-0">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-sm break-words">{name || emptyLabel}</p>
          {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      {phone ? (
        <p className="flex items-center gap-2 text-sm text-foreground pl-0.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
          {phone}
        </p>
      ) : null}
      {email ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground break-all pl-0.5">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {email}
        </p>
      ) : null}
      {extra}
    </div>
  );
}

function renderFieldGroup(
  fields: ProfileField[],
  keys: string[],
  t: ReturnType<typeof useTranslations>,
  emptyLabel: string,
  formatValue?: (field: ProfileField) => string | null,
) {
  const byKey = new Map(fields.map((f) => [f.labelKey, f]));
  return keys.map((key) => {
    const field = byKey.get(key);
    if (!field) return null;
    const Icon = FIELD_ICONS[key] ?? ClipboardList;
    return (
      <InfoField
        key={key}
        icon={Icon}
        label={t(`fields.${key}`)}
        value={formatValue ? formatValue(field) : field.value}
        emptyLabel={emptyLabel}
        multiline={field.multiline}
      />
    );
  });
}

export function EnfantProfileView({ enfant, classes, locale }: EnfantProfileViewProps) {
  const t = useTranslations("admin.children.profile");
  const emptyLabel = t("emptyValue");

  const profile = useMemo(
    () => buildEnfantProfile(enfant, classes, locale),
    [enfant, classes, locale],
  );

  const identityByKey = useMemo(
    () => new Map(profile.identityFields.map((f) => [f.labelKey, f])),
    [profile.identityFields],
  );

  const birthField = identityByKey.get("dateOfBirth");
  const ageField = identityByKey.get("age");
  const genderField = identityByKey.get("gender");

  const formatGender = (field: ProfileField) => {
    if (!field.value) return null;
    if (field.value === "M") return t("gender.M");
    if (field.value === "F") return t("gender.F");
    return field.value;
  };

  const formatLanguage = (field: ProfileField) => {
    if (!field.value) return null;
    if (field.value === "fr") return t("language.fr");
    if (field.value === "ar") return t("language.ar");
    return field.value;
  };

  const formatInscriptionStatus = (field: ProfileField) => {
    if (!field.value) return null;
    const key = field.value as "CANDIDATURE" | "EN_COURS" | "ACTIF" | "REJETEE";
    return t.has(`inscriptionStatus.${key}`) ? t(`inscriptionStatus.${key}`) : field.value;
  };

  const formatConsent = (field: ProfileField) => {
    if (field.value === "yes") return t("consent.yes");
    if (field.value === "no") return t("consent.no");
    return null;
  };

  const restrictionLabel = profile.restrictionLabel
    ? t.has(`restrictions.${profile.restrictionLabel}`)
      ? t(`restrictions.${profile.restrictionLabel}`)
      : profile.restrictionLabel === "autre"
        ? profile.restrictionDetails ?? t("restrictions.autre")
        : profile.restrictionLabel
    : null;

  const genderLabel = genderField ? formatGender(genderField) : null;

  const showDesiredClass =
    profile.desiredClasseLabel &&
    profile.desiredClasseLabel !== profile.classeLabel;

  return (
    <div className="space-y-5">
      {/* ── En-tête fiche ── */}
      <Card className="overflow-hidden border border-border/80 shadow-sm rounded-2xl">
        <div className="px-4 sm:px-6 py-5 bg-white">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-border/80 shadow-sm bg-muted flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <Baby className="h-10 w-10 text-slate-400" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left space-y-4 w-full">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words">{profile.fullName}</h2>
                {profile.archived && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    {t("badges.archivedChild")}
                  </Badge>
                )}
              </div>

              {(birthField?.value || ageField?.value || genderLabel) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl mx-auto sm:mx-0">
                  {birthField?.value ? (
                    <QuickStat icon={Calendar} label={t("fields.dateOfBirth")} value={birthField.value} />
                  ) : null}
                  {ageField?.value ? (
                    <QuickStat icon={Baby} label={t("fields.age")} value={ageField.value} />
                  ) : null}
                  {genderLabel ? (
                    <QuickStat icon={Users} label={t("fields.gender")} value={genderLabel} />
                  ) : null}
                </div>
              )}

              {profile.archivedAt && (
                <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {t("fields.archivedAt")} : {profile.archivedAt}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              {t("groups.schooling")}
            </p>
            <div className={cn("grid gap-3", showDesiredClass ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
              <SchoolingHighlight
                label={t("fields.class")}
                value={profile.classeLabel}
                icon={BookOpen}
                emptyLabel={emptyLabel}
                variant="primary"
              />
              {showDesiredClass ? (
                <SchoolingHighlight
                  label={t("fields.desiredClass")}
                  value={profile.desiredClasseLabel}
                  icon={GraduationCap}
                  emptyLabel={emptyLabel}
                  variant="secondary"
                />
              ) : null}
            </div>
          </div>
        </div>

        {(profile.adminRemarks || (profile.parentRemarks && profile.parentRemarks !== profile.adminRemarks)) && (
          <div className="px-4 sm:px-6 py-4 space-y-3 border-t border-border/60 bg-muted/10">
            {profile.adminRemarks && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-xl">
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-1.5">
                  <NotebookPen className="h-4 w-4 shrink-0" aria-hidden />
                  {t("sections.adminRemarks")}
                </p>
                <p className="text-sm text-amber-950 whitespace-pre-line">{profile.adminRemarks}</p>
              </div>
            )}
            {profile.parentRemarks && profile.parentRemarks !== profile.adminRemarks && (
              <div className="p-3.5 bg-muted/30 border border-border rounded-xl">
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1.5">
                  <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                  {t("sections.parentRemarks")}
                </p>
                <p className="text-sm text-foreground whitespace-pre-line">{profile.parentRemarks}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Santé (prioritaire pour la crèche) ── */}
      <SectionCard title={t("sections.health")} icon={HeartPulse} accent="rose">
        {(profile.healthTags.allergies.length > 0 ||
          profile.healthTags.intolerances.length > 0 ||
          profile.restrictionLabel ||
          profile.sansRestriction) && (
          <div className="space-y-3 pb-1">
            <SubsectionTitle>{t("groups.healthAlerts")}</SubsectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TagGroup
                label={t("tags.allergies")}
                icon={AlertTriangle}
                items={profile.healthTags.allergies}
                emptyLabel={emptyLabel}
                tone="red"
              />
              <TagGroup
                label={t("tags.intolerances")}
                icon={AlertTriangle}
                items={profile.healthTags.intolerances}
                emptyLabel={emptyLabel}
                tone="orange"
              />
            </div>
            {(profile.restrictionLabel && profile.restrictionLabel !== "sans_restriction") || profile.sansRestriction ? (
              <div className="flex gap-3 rounded-xl border border-yellow-200 bg-yellow-50/90 p-3.5">
                <span className="w-8 h-8 rounded-lg bg-yellow-100 border border-yellow-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-yellow-800" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold text-yellow-900 mb-0.5">{t("fields.dietaryRestriction")}</p>
                  <p className="text-sm text-yellow-950 font-medium">
                    {profile.sansRestriction && !restrictionLabel
                      ? t("restrictions.sans_restriction")
                      : restrictionLabel ?? emptyLabel}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <SubsectionTitle>{t("groups.medicalFile")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderFieldGroup(profile.healthFields, ["height", "weight", "doctor"], t, emptyLabel)}
        </div>
        <div className="grid grid-cols-1 gap-3">
          {renderFieldGroup(
            profile.healthFields,
            ["familyHistory", "surgicalInterventions", "medicalNotes", "dietaryNotes"],
            t,
            emptyLabel,
          )}
        </div>

        <SubsectionTitle>{t("tags.diseases")}</SubsectionTitle>
        <TagGroup
          label={t("tags.diseases")}
          icon={HeartPulse}
          items={profile.healthTags.maladies}
          emptyLabel={emptyLabel}
          tone="blue"
        />
      </SectionCard>

      {/* ── Identité ── */}
      <SectionCard title={t("sections.identity")} icon={IdCard} accent="sky">
        <SubsectionTitle>{t("groups.civilStatus")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {renderFieldGroup(
            profile.identityFields,
            ["birthCity", "nationality"],
            t,
            emptyLabel,
          )}
        </div>

        <SubsectionTitle>{t("groups.residence")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {renderFieldGroup(
            profile.identityFields,
            ["currentAddress", "currentCity"],
            t,
            emptyLabel,
          )}
        </div>

        <SubsectionTitle>{t("groups.siblings")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderFieldGroup(profile.identityFields, ["siblingCount", "siblingRank"], t, emptyLabel)}
        </div>
      </SectionCard>

      {/* ── Famille ── */}
      <SectionCard title={t("sections.parents")} icon={Users} accent="emerald">
        {profile.tuteurs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            {profile.tuteurs.map((tuteur) => (
              <TuteurCard key={tuteur.key} tuteur={tuteur} t={t} emptyLabel={emptyLabel} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic mb-4">{emptyLabel}</p>
        )}

        <SubsectionTitle>{t("groups.familyInfo")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.familleFields.map((field) => {
            const Icon = FIELD_ICONS[field.labelKey] ?? Users;
            return (
              <InfoField
                key={field.labelKey}
                icon={Icon}
                label={t(`fields.${field.labelKey}`)}
                value={
                  field.labelKey === "familyLanguage" ? formatLanguage(field) : field.value
                }
                emptyLabel={emptyLabel}
                multiline={field.multiline}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* ── Urgence & autorisations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={t("sections.emergency")} icon={Phone} accent="amber" className="h-full">
          {profile.emergencyContacts.length > 0 ? (
            <div className="space-y-3">
              {profile.emergencyContacts.map((contact) => (
                <ContactCard
                  key={`em-${contact.key}`}
                  name={`${contact.prenom} ${contact.nom}`.trim()}
                  subtitle={t(`roles.${contact.roleKey}`)}
                  phone={contact.telephone}
                  email={contact.email}
                  emptyLabel={emptyLabel}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">{emptyLabel}</p>
          )}
        </SectionCard>

        <SectionCard title={t("sections.authorized")} icon={ShieldCheck} accent="sky" className="h-full">
          {profile.sansRestriction ? (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)]/50 p-3.5">
              <ShieldCheck className="h-5 w-5 pp-text-success shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-foreground font-medium">{t("authorized.noRestriction")}</p>
            </div>
          ) : profile.authorizedPersons.length > 0 ? (
            <div className="space-y-3">
              {profile.authorizedPersons.map((person, index) => (
                <ContactCard
                  key={`${person.name}-${index}`}
                  name={person.name}
                  phone={person.phone}
                  emptyLabel={emptyLabel}
                  extra={
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3 shrink-0" aria-hidden />
                        {person.relationship ?? emptyLabel}
                      </p>
                      {person.cin ? (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          <IdCard className="h-3 w-3 shrink-0" aria-hidden />
                          {person.cin}
                        </p>
                      ) : null}
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">{emptyLabel}</p>
          )}
        </SectionCard>
      </div>

      {/* ── Dossier inscription ── */}
      <SectionCard title={t("sections.registration")} icon={ClipboardList} accent="violet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {profile.inscriptionFields.map((field) => {
            const Icon = FIELD_ICONS[field.labelKey] ?? ClipboardList;
            return (
              <InfoField
                key={field.labelKey}
                icon={Icon}
                label={t(`fields.${field.labelKey}`)}
                value={
                  field.labelKey === "registrationStatus"
                    ? formatInscriptionStatus(field)
                    : field.value
                }
                emptyLabel={emptyLabel}
              />
            );
          })}
        </div>

        <SubsectionTitle>{t("sections.consents")}</SubsectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.consentFields.map((field) => {
            const value = formatConsent(field);
            const Icon = value === t("consent.yes") ? CheckCircle2 : value === t("consent.no") ? XCircle : ClipboardList;
            return (
              <InfoField
                key={field.labelKey}
                icon={Icon}
                label={t(`fields.${field.labelKey}`)}
                value={value}
                emptyLabel={emptyLabel}
              />
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
