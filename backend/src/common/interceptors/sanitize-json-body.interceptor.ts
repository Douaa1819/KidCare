import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { deepSanitizeJsonBody } from '../sanitizer/deep-sanitize';

const API_PREFIX = '/api';

/** Corps d’auth ou jetons : ne pas passer au sanitizer. */
const SANITIZE_SKIP_PATHS = new Set([
  '/auth/login',
  '/auth/login-user',
  '/auth/refresh',
  '/auth/verify',
  '/class-activity-photos', // multipart (champs texte + fichier)
]);

function normalizeRoutePath(url: string): string {
  const pathOnly = url.split('?')[0] || '';
  if (pathOnly.startsWith(API_PREFIX)) {
    const rest = pathOnly.slice(API_PREFIX.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathOnly;
}

export function shouldSkipBodySanitize(url: string, method: string): boolean {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return true;
  const p = normalizeRoutePath(url);
  if (SANITIZE_SKIP_PATHS.has(p)) return true;
  return false;
}

@Injectable()
export class SanitizeJsonBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const url = (req.originalUrl || req.url || '') as string;
    const method = (req.method || 'GET') as string;

    if (
      !shouldSkipBodySanitize(url, method) &&
      req.body &&
      typeof req.body === 'object'
    ) {
      req.body = deepSanitizeJsonBody(req.body);
    }

    return next.handle();
  }
}
