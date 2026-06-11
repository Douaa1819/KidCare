"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { UserSearchPicker, type PickedUser } from "@/components/platform/user-search-picker";
import { apiClient } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/feedback";
import type { Locale } from "@/lib/i18n/config";
import { Loader2 } from "lucide-react";

const RESTRICTION_KEYS = [
  "cannotLogin", "readOnly", "noPhotoUpload", "noEventManagement",
  "noPresenceManagement", "noChildManagement", "noSettingsAccess",
  "noAdminManagement", "noTeacherManagement", "noParentManagement",
] as const;

export default function PlatformAccessPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.access");
  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);
  const [restrictions, setRestrictions] = useState<Record<string, boolean>>({});
  const [loadingRestrictions, setLoadingRestrictions] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRestrictions = useCallback(async (userId: string) => {
    setLoadingRestrictions(true);
    try {
      const res = await apiClient.getPlatformUserRestrictions(userId);
      setRestrictions(res.data ?? {});
    } catch {
      setRestrictions({});
      notifyError(t("loadError"));
    } finally {
      setLoadingRestrictions(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedUser) {
      void loadRestrictions(selectedUser.id);
    } else {
      setRestrictions({});
    }
  }, [selectedUser, loadRestrictions]);

  async function save() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await apiClient.updatePlatformUserRestrictions(selectedUser.id, restrictions);
      notifySuccess(t("saved"));
    } catch {
      notifyError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      <Card className="p-5 max-w-xl space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t("selectUser")}</p>
          <UserSearchPicker value={selectedUser} onChange={setSelectedUser} />
        </div>

        {selectedUser && loadingRestrictions && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingRestrictions")}
          </div>
        )}

        {selectedUser && !loadingRestrictions && (
          <>
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {RESTRICTION_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(restrictions[key])}
                    onChange={(e) => setRestrictions({ ...restrictions, [key]: e.target.checked })}
                  />
                  {t(`restrictions.${key}`)}
                </label>
              ))}
            </div>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
          </>
        )}
      </Card>
    </PlatformShell>
  );
}
