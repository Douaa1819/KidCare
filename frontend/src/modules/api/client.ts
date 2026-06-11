import ky, { HTTPError } from 'ky';
import { apiClient } from '@/lib/api';
import { logoutSession } from '@/lib/auth-session';
import { readLocaleCookie } from '@/lib/locale-cookie';

const API_PREFIX =
  typeof window !== 'undefined'
    ? '/api/backend'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

/**
 * Client Ky : proxy same-origin (cookies HttpOnly), pas de jeton en mémoire JS.
 */
export const api = ky.create({
  prefixUrl: API_PREFIX,
  credentials: 'include',
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          const opts = options as { _kyRefresh?: boolean };
          if (!opts._kyRefresh) {
            const refreshed = await apiClient.refreshSession();
            if (refreshed) {
              opts._kyRefresh = true;
              return ky(request);
            }
          }
          await logoutSession();
          if (typeof window !== 'undefined') {
            window.location.href = `/${readLocaleCookie()}`;
          }
        }

        if (response.status === 403) {
          throw new Error('Accès refusé');
        }

        if (response.status === 404) {
          throw new Error('Ressource non trouvée');
        }

        if (response.status >= 500) {
          throw new Error('Erreur serveur');
        }
      },
    ],
  },
});

export async function apiGet<T>(url: string, options?: Parameters<typeof api.get>[1]): Promise<T> {
  try {
    return await api.get(url, options).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message || 'Erreur API');
    }
    throw error;
  }
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  options?: Parameters<typeof api.post>[1],
): Promise<T> {
  try {
    return await api.post(url, { json: body, ...options }).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message || 'Erreur API');
    }
    throw error;
  }
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  options?: Parameters<typeof api.patch>[1],
): Promise<T> {
  try {
    return await api.patch(url, { json: body, ...options }).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message || 'Erreur API');
    }
    throw error;
  }
}

export async function apiDelete<T>(
  url: string,
  options?: Parameters<typeof api.delete>[1],
): Promise<T> {
  try {
    return await api.delete(url, options).json<T>();
  } catch (error) {
    if (error instanceof HTTPError) {
      const data = await error.response.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message || 'Erreur API');
    }
    throw error;
  }
}
