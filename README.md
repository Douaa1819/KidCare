# KidCare

A modern daycare management SaaS platform.

KidCare is a full-stack application for daycare centers: enrollments, daily operations, parent communication, attendance, menus, and role-based dashboards for administrators, teachers, and parents.

Repository: https://github.com/Douaa1819/KidCare

---

## Main features

- **Enrollment** — Multi-step parent registration, status tracking, internal regulations acceptance
- **Admin dashboard** — Children, classes, users, inscriptions, menus, presences, platform settings
- **Teacher dashboard** — Class view, daily attendance, activity summaries, photo uploads
- **Parent dashboard** — Child overview, menus, events, daily summaries, photos
- **Authentication** — JWT-based auth with roles: `SUPER_ADMIN`, `ADMIN`, `ENSEIGNANT`, `PARENT`
- **Email notifications** — Invitations, password reset, enrollment confirmations (SMTP)
- **Internationalization** — French and Arabic (next-intl)
- **PWA** — Installable progressive web app support

---

## Architecture

Monorepo with two applications:

```text
KidCare/
├── frontend/   # Next.js 16 web app (port 3001)
├── backend/    # NestJS 11 API + Prisma (port 3000)
└── README.md
```

| Layer    | Stack |
|----------|-------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, next-intl, React Query |
| Backend  | NestJS, Prisma, PostgreSQL, JWT, Swagger, Nodemailer |
| Database | PostgreSQL (via Docker or local install) |

---

## Technologies

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-intl, TanStack Query, Zustand, Zod, Axios

**Backend:** NestJS 11, Prisma 6, PostgreSQL, bcrypt, class-validator, Swagger, Helmet, Throttler

---

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm
- PostgreSQL (or Docker)

---

## Environment variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Backend (`backend/.env`)

See `backend/.env.example` for the full list. Minimum:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kidcare"
NODE_ENV=development
JWT_SECRET=your_dev_secret
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001
ADMIN_EMAIL=admin@demo.kidcare.app
ADMIN_PASSWORD=change_me
```

Optional SMTP (required for real email sending):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@kidcare.app
SMTP_PASS=your-smtp-password
SMTP_FROM="KidCare <noreply@kidcare.app>"
```

---

## Database setup

### Option A — Docker

From `backend/`:

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 with database `creche`.

### Option B — Local PostgreSQL

Create a database and set `DATABASE_URL` in `backend/.env`.

### Migrations & seed

```bash
cd backend
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate:deploy
pnpm run seed
```

Demo accounts after seed:

| Role       | Email                          | Password (default)   |
|------------|--------------------------------|----------------------|
| Super Admin| admin@demo.kidcare.app         | `change_me`          |
| Admin      | sophie@demo.kidcare.app        | `Sophie123!`         |
| Teacher    | enseignant.sophie@test.com     | `Teacher123!`        |
| Parent     | sophie.parent@demo.kidcare.app | `SophieParent123!`   |

---

## Backend setup

```bash
cd backend
pnpm install
pnpm run start:dev
```

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/health

---

## Frontend setup

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3001/fr for the login page.

---

## Docker

Database only (from `backend/docker-compose.yml`):

```bash
cd backend
docker compose up -d
```

---

## Testing

**Backend:**

```bash
cd backend
pnpm run test
pnpm run test:e2e
pnpm run lint
```

**Frontend:**

```bash
cd frontend
pnpm run lint
```

---

## Main user roles

| Role          | Access |
|---------------|--------|
| SUPER_ADMIN   | Full platform control, settings, all modules |
| ADMIN         | Daycare management: children, classes, users, menus, presences |
| ENSEIGNANT    | Assigned classes, attendance, summaries, photos |
| PARENT        | Own children: enrollment, menus, summaries, photos |

---

## Main modules

- **Auth** — Login, JWT refresh, password reset
- **Inscriptions** — Public registration form, admin review workflow
- **Enfants** — Child profiles, class assignment, health info
- **Classes** — Sections, capacity, age groups
- **Presences** — Daily attendance tracking
- **Menus** — Weekly meal planning
- **Daily resumes** — Teacher daily summaries for parents
- **Photos** — Activity photos per class
- **Events** — Daycare events calendar
- **Users** — Admin/teacher/parent account management
- **Platform settings** — Branding, permissions, feature flags

---

## Project structure

```text
frontend/src/
  app/[locale]/     # Localized routes (admin, teacher, parent)
  components/       # UI components
  lib/              # API client, i18n, utilities
  messages/         # Translation files (fr, ar)

backend/src/
  modules/          # NestJS feature modules
  common/           # Shared services, guards, email templates
  prisma/           # Schema, migrations, seed
```

---

## License

Private portfolio / SaaS project.
