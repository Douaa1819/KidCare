# KidCare Frontend

Next.js frontend for the KidCare daycare management platform.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- next-intl (FR/AR)
- TanStack React Query
- React Hook Form + Zod

## Setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Open [http://localhost:3001/fr](http://localhost:3001/fr)

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Commands

```bash
pnpm dev      # Development (port 3001)
pnpm build    # Production build
pnpm start    # Production server
pnpm lint     # ESLint
```

## Backend

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
