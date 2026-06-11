const WEAK_SECRETS = new Set(['dev_secret', 'super_secret_dev_key_change_in_prod', 'change_me']);

export function validateEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';
  const errors: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    errors.push('DATABASE_URL est requis');
  }

  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET est requis');
  } else if (isProd && (jwtSecret.length < 32 || WEAK_SECRETS.has(jwtSecret))) {
    errors.push('JWT_SECRET doit être fort (≥ 32 caractères) en production');
  }

  if (isProd) {
    if (!process.env.FRONTEND_URL?.trim() && !process.env.APP_URL?.trim()) {
      errors.push('FRONTEND_URL ou APP_URL est requis en production');
    }
    if (!process.env.CORS_ORIGINS?.trim()) {
      errors.push('CORS_ORIGINS doit être défini en production (pas de wildcard)');
    }
    if (WEAK_SECRETS.has(process.env.ADMIN_PASSWORD?.trim() ?? '')) {
      errors.push('ADMIN_PASSWORD doit être changé en production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration invalide:\n- ${errors.join('\n- ')}`);
  }
}
