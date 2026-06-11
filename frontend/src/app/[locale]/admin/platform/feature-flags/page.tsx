"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/feedback";
import type { Locale } from "@/lib/i18n/config";
import { Loader2 } from "lucide-react";

type Flag = { id: string; key: string; label: string; enabled: boolean };

export default function PlatformFeatureFlagsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.featureFlags");
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.listPlatformFeatureFlags()
      .then((res) => setFlags(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: string, enabled: boolean) {
    setUpdating(key);
    try {
      await apiClient.updatePlatformFeatureFlag(key, enabled);
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
      notifySuccess(t("updated"));
    } catch {
      notifyError(t("updateError"));
    } finally {
      setUpdating(null);
    }
  }

  function flagLabel(key: string, fallback: string) {
    const known = ["events", "photos", "messages", "presence", "menus", "reports", "notifications", "ai"];
    return known.includes(key) ? t(`keys.${key}` as "keys.events") : fallback;
  }

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          {t("loading")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
          {flags.map((flag) => (
            <Card key={flag.id} className="p-4 flex items-center justify-between gap-4 border-gray-200/80 shadow-sm">
              <div>
                <p className="font-medium text-gray-900">{flagLabel(flag.key, flag.label)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{flag.enabled ? t("enabled") : t("disabled")}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={flag.enabled}
                  disabled={updating === flag.key}
                  onChange={(e) => void toggle(flag.key, e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
              </label>
            </Card>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
