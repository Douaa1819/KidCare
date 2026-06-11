"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Loader2, Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickedUser = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  statut?: string;
};

type Props = {
  value: PickedUser | null;
  onChange: (user: PickedUser | null) => void;
  includeArchived?: boolean;
  className?: string;
};

const MIN_CHARS = 2;

function roleLabel(role: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: t("roles.superAdmin"),
    ADMIN: t("roles.admin"),
    ENSEIGNANT: t("roles.teacher"),
    PARENT: t("roles.parent"),
  };
  return map[role] ?? role;
}

export function UserSearchPicker({ value, onChange, includeArchived = true, className }: Props) {
  const t = useTranslations("platform.access");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PickedUser[]>([]);
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const search = useCallback(async (term: string) => {
    if (term.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await apiClient.listPlatformUsers({
        q: term,
        includeArchived,
        limit: 20,
      });
      if (id !== requestId.current) return;
      const data = (res.data?.data ?? []) as PickedUser[];
      setResults(data);
    } catch {
      if (id !== requestId.current) return;
      setResults([]);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    if (!open) return;
    void search(debouncedQuery);
  }, [debouncedQuery, open, search]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function handleSelect(user: PickedUser) {
    onChange(user);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
    setResults([]);
  }

  if (value) {
    return (
      <div className={cn("flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5", className)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">
            {value.prenom} {value.nom}
          </p>
          <p className="truncate text-xs text-gray-500">
            {value.email} · {roleLabel(value.role, t)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="shrink-0 text-gray-500">
          <X className="h-4 w-4 me-1" />
          {t("changeUser")}
        </Button>
      </div>
    );
  }

  const showDropdown = open && (loading || debouncedQuery.length >= MIN_CHARS || query.trim().length > 0);
  const showMinChars = query.trim().length > 0 && query.trim().length < MIN_CHARS;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <Input
          type="search"
          placeholder={t("userSearchPlaceholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="ps-9 pe-10"
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-600" />
        )}
      </div>

      {showMinChars && (
        <p className="mt-1.5 text-xs text-gray-500">{t("minChars")}</p>
      )}

      {showDropdown && !showMinChars && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">{t("searching")}</li>
          )}
          {!loading && debouncedQuery.length >= MIN_CHARS && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">{t("noUsersFound")}</li>
          )}
          {results.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-start text-sm hover:bg-violet-50 focus:bg-violet-50 focus:outline-none"
                onClick={() => handleSelect(user)}
              >
                <span className="font-medium text-gray-900">
                  {user.prenom} {user.nom}
                </span>
                <span className="block text-xs text-gray-500">
                  {user.email} · {roleLabel(user.role, t)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
