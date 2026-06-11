"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/feedback";
import type { Locale } from "@/lib/i18n/config";
import { Loader2 } from "lucide-react";

type SettingsData = {
  general?: Record<string, unknown>;
  auth?: Record<string, unknown>;
  invitations?: Record<string, unknown>;
};

export default function PlatformSettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.settings");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [general, setGeneral] = useState({ platformName: "", logo: "", contactEmail: "", timezone: "", defaultLanguage: "fr" });
  const [auth, setAuth] = useState({
    passwordMinLength: 8, requireUppercase: true, requireNumbers: true, requireSymbols: false,
    sessionTimeoutMinutes: 15, maxLoginAttempts: 5,
  });
  const [invitations, setInvitations] = useState({ invitationExpirationDays: 7, tempPasswordExpirationDays: 3 });

  useEffect(() => {
    void apiClient.getPlatformSettings().then((res) => {
      const d = res.data as SettingsData;
      if (d.general) setGeneral((g) => ({ ...g, ...d.general } as typeof general));
      if (d.auth) setAuth((a) => ({ ...a, ...d.auth } as typeof auth));
      if (d.invitations) setInvitations((i) => ({ ...i, ...d.invitations } as typeof invitations));
    }).finally(() => setLoading(false));
  }, []);

  async function saveSection(section: "general" | "auth" | "invitations", data: Record<string, unknown>) {
    setSaving(section);
    try {
      await apiClient.updatePlatformSettings(section, data);
      notifySuccess(t("saved"));
    } catch {
      notifyError(t("saveError"));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <PlatformShell locale={locale} title={t("title")} description={t("description")}>
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          {tc("loading")}
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      <div className="space-y-6 max-w-2xl">
        <Card className="p-5 border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">{t("sections.general")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.platformName")}</label>
              <Input value={general.platformName} onChange={(e) => setGeneral({ ...general, platformName: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.logo")}</label>
              <Input value={general.logo} onChange={(e) => setGeneral({ ...general, logo: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.contactEmail")}</label>
              <Input type="email" value={general.contactEmail} onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.timezone")}</label>
              <Input value={general.timezone} onChange={(e) => setGeneral({ ...general, timezone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.defaultLanguage")}</label>
              <select
                value={general.defaultLanguage}
                onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
          <Button disabled={saving === "general"} onClick={() => void saveSection("general", general)}>
            {saving === "general" ? tc("loading") : tc("save")}
          </Button>
        </Card>

        <Card className="p-5 border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">{t("sections.auth")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.passwordMinLength")}</label>
              <Input type="number" min={6} value={auth.passwordMinLength} onChange={(e) => setAuth({ ...auth, passwordMinLength: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.sessionTimeout")}</label>
              <Input type="number" min={5} value={auth.sessionTimeoutMinutes} onChange={(e) => setAuth({ ...auth, sessionTimeoutMinutes: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.maxLoginAttempts")}</label>
              <Input type="number" min={1} value={auth.maxLoginAttempts} onChange={(e) => setAuth({ ...auth, maxLoginAttempts: Number(e.target.value) })} />
            </div>
            {(["requireUppercase", "requireNumbers", "requireSymbols"] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input type="checkbox" checked={auth[key]} onChange={(e) => setAuth({ ...auth, [key]: e.target.checked })} />
                {t(`fields.${key}`)}
              </label>
            ))}
          </div>
          <Button disabled={saving === "auth"} onClick={() => void saveSection("auth", auth)}>
            {saving === "auth" ? tc("loading") : tc("save")}
          </Button>
        </Card>

        <Card className="p-5 border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">{t("sections.invitations")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.invitationExpiration")}</label>
              <Input type="number" min={1} value={invitations.invitationExpirationDays} onChange={(e) => setInvitations({ ...invitations, invitationExpirationDays: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">{t("fields.tempPasswordExpiration")}</label>
              <Input type="number" min={1} value={invitations.tempPasswordExpirationDays} onChange={(e) => setInvitations({ ...invitations, tempPasswordExpirationDays: Number(e.target.value) })} />
            </div>
          </div>
          <Button disabled={saving === "invitations"} onClick={() => void saveSection("invitations", invitations)}>
            {saving === "invitations" ? tc("loading") : tc("save")}
          </Button>
        </Card>
      </div>
    </PlatformShell>
  );
}
