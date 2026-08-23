export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  childMinAgeValue: parseInt(process.env.CHILD_MIN_AGE_VALUE ?? '6', 10),
  childMinAgeUnit: process.env.CHILD_MIN_AGE_UNIT ?? 'months',
  childMaxAgeValue: parseInt(process.env.CHILD_MAX_AGE_VALUE ?? '5', 10),
  childMaxAgeUnit: process.env.CHILD_MAX_AGE_UNIT ?? 'years',
  databaseUrl: process.env.DATABASE_URL,
  /** Désactive tous les emails de notification (présence, événements…) — les invitations admin peuvent rester gérées séparément */
  notificationEmailsEnabled:
    (process.env.NOTIFICATION_EMAILS_ENABLED ?? 'true').toLowerCase() !== 'false',
  appUrl: process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3001',
  n8nAiRewriteWebhookUrl: process.env.N8N_AI_REWRITE_WEBHOOK_URL ?? '',
});
