'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchSession } from '@/lib/auth-session';
import { useAuthStore } from './store';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('ADMIN' | 'ENSEIGNANT' | 'PARENT')[];
}

/**
 * Composant pour protéger les routes (complément au middleware).
 */
export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrateFromSession } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void hydrateFromSession().then(() => setChecked(true));
  }, [hydrateFromSession]);

  if (!checked) return null;

  if (!user) {
    const isArabic = pathname?.startsWith('/ar');
    const targetLocale = isArabic ? 'ar' : 'fr';
    router.replace(`/${targetLocale}`);
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    router.replace('/');
    return null;
  }

  return <>{children}</>;
}

export function useCanAccess(requiredRoles?: ('ADMIN' | 'ENSEIGNANT' | 'PARENT')[]) {
  const { user } = useAuthStore();

  if (!user) return false;
  if (!requiredRoles) return true;

  return requiredRoles.includes(user.role);
}

export function useIsAdmin() {
  const { user } = useAuthStore();
  return user?.role === 'ADMIN';
}

export function useIsTeacher() {
  const { user } = useAuthStore();
  return user?.role === 'ENSEIGNANT';
}

export function useIsParent() {
  const { user } = useAuthStore();
  return user?.role === 'PARENT';
}

/** Hydrate le store auth depuis la session HttpOnly. */
export function useHydrateAuth() {
  const hydrateFromSession = useAuthStore((s) => s.hydrateFromSession);
  useEffect(() => {
    void fetchSession().then(() => hydrateFromSession());
  }, [hydrateFromSession]);
}
