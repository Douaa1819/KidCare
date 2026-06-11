import { RoleUtilisateur } from '@prisma/client';

export const PERMISSION_RESOURCES = [
  'users',
  'children',
  'classes',
  'events',
  'menus',
  'photos',
  'reports',
  'settings',
  'admins',
] as const;

export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

export type PermissionFlags = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  upload: boolean;
  export: boolean;
  archive: boolean;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<
  RoleUtilisateur,
  Record<PermissionResource, PermissionFlags>
> = {
  SUPER_ADMIN: {
    users: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
    children: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
    classes: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
    events: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
    menus: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
    photos: { view: true, create: false, edit: true, delete: true, upload: true, export: false, archive: true },
    reports: { view: true, create: false, edit: false, delete: false, upload: false, export: true, archive: false },
    settings: { view: true, create: false, edit: true, delete: false, upload: false, export: false, archive: false },
    admins: { view: true, create: true, edit: true, delete: true, upload: false, export: true, archive: true },
  },
  ADMIN: {
    users: { view: true, create: true, edit: true, delete: false, upload: false, export: true, archive: true },
    children: { view: true, create: true, edit: true, delete: false, upload: false, export: true, archive: true },
    classes: { view: true, create: true, edit: true, delete: false, upload: false, export: true, archive: true },
    events: { view: true, create: true, edit: true, delete: false, upload: false, export: true, archive: true },
    menus: { view: true, create: true, edit: true, delete: false, upload: false, export: true, archive: true },
    photos: { view: true, create: false, edit: true, delete: true, upload: true, export: false, archive: true },
    reports: { view: true, create: false, edit: false, delete: false, upload: false, export: true, archive: false },
    settings: { view: true, create: false, edit: true, delete: false, upload: false, export: false, archive: false },
    admins: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
  },
  ENSEIGNANT: {
    users: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    children: { view: true, create: false, edit: true, delete: false, upload: false, export: false, archive: false },
    classes: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    events: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    menus: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    photos: { view: true, create: false, edit: false, delete: false, upload: true, export: false, archive: false },
    reports: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    settings: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    admins: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
  },
  PARENT: {
    users: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    children: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    classes: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    events: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    menus: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    photos: { view: true, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    reports: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    settings: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
    admins: { view: false, create: false, edit: false, delete: false, upload: false, export: false, archive: false },
  },
};

export const DEFAULT_FEATURE_FLAGS = [
  { key: 'events', label: 'Événements', enabled: true },
  { key: 'photos', label: 'Photos', enabled: true },
  { key: 'messages', label: 'Messages', enabled: true },
  { key: 'presence', label: 'Présences', enabled: true },
  { key: 'menus', label: 'Menus', enabled: true },
  { key: 'reports', label: 'Rapports', enabled: true },
  { key: 'notifications', label: 'Notifications', enabled: true },
  { key: 'ai', label: 'Fonctionnalités IA', enabled: true },
] as const;

export const DEFAULT_PLATFORM_SETTINGS = {
  general: {
    platformName: 'Petitspas',
    logo: '/Group 13.svg',
    contactEmail: 'support@petitspas.ma',
    timezone: 'Africa/Casablanca',
    defaultLanguage: 'fr',
    supportedLanguages: ['fr', 'ar'],
  },
  auth: {
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
    sessionTimeoutMinutes: 15,
    maxLoginAttempts: 5,
  },
  invitations: {
    invitationExpirationDays: 7,
    tempPasswordExpirationDays: 3,
  },
  parents: {
    canAddAuthorizedPersons: true,
    maxAuthorizedPersons: 5,
    canEditProfile: true,
  },
  teachers: {
    canEditSummaries: true,
    canUploadPhotos: true,
    canEditMenus: false,
  },
  admins: {
    canCreateTeachers: true,
    canCreateParents: true,
    canEditEvents: true,
    canManageClasses: true,
  },
  email: {
    smtpEnabled: true,
    fromAddress: 'noreply@petitspas.ma',
    replyTo: 'support@petitspas.ma',
  },
  maintenance: {
    maintenanceMode: false,
    maintenanceMessage: '',
    allowSuperAdminAccess: true,
  },
};
