# Vercel Deployment Guide — Cognitive Support Backend

## Service Type
**Serverless Function** via `@vercel/node` (Express exported as a handler)

## How This Works on Vercel

Vercel does not run a persistent `node server.js` process.
Instead, `api/index.ts` exports the Express app as a default function handler.
Vercel invokes it per request. The DB connection is reused across warm invocations.

## Prisma 7 Config Note

- `schema.prisma` datasource block has **no `url` field** — correct for Prisma 7.
- `DATABASE_URL` is managed exclusively via `prisma.config.ts` and environment variables.
- Adding `url = env("DATABASE_URL")` to `schema.prisma` causes error **P1012**.

---

## Vercel Project Setup

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** → `backend`
4. **Framework Preset** → `Other`
5. **Build Command** → `npm run build` *(or leave blank — Vercel handles it via vercel.json)*
6. **Output Directory** → leave blank
7. Add all environment variables (see table below)
8. Deploy

---

## Environment Variables (set in Vercel dashboard)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase **Session Pooler** URL (see note below) |
| `JWT_SECRET` | Long random secret (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `API_PUBLIC_URL` | `https://YOUR-PROJECT.vercel.app` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID (or leave empty) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail App Password |
| `MAIL_FROM` | Your Gmail address |
| `LOG_LEVEL` | `info` |
| `CLIENT_APP_URL` | Your Expo/frontend URL |

> ⚠️ Do **not** set `PORT` — Vercel manages routing internally.

---

## DATABASE_URL for Vercel

Vercel is serverless and runs on **IPv4**. Use the **Session Pooler** URL:

```
postgresql://postgres.xxyfvybcgyyfrklmlejy:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

> Note: URL-encode special characters in password (e.g. `@` → `%40`)

---

## Migrations

**Migrations do NOT run automatically on Vercel.** Run them manually from your local machine whenever your schema changes:

```bash
# Make sure your local .env DATABASE_URL points to Supabase
npm run db:deploy
```

This applies all pending migrations from `prisma/migrations/` to Supabase.

---

## Build Process (what @vercel/node does automatically)

1. Installs dependencies (`npm ci`)
2. Compiles `api/index.ts` (and its imports from `src/`) via TypeScript
3. Deploys as a serverless function

> **Note:** `prisma generate` must be run before deploy. Add it to the Vercel build command if the client is stale:
> Build Command: `npx prisma generate`

---

## Local Development (unchanged)

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm run dev            # tsx watch — hot reload, uses .env
```

---

## Migrations Workflow

| Command | When |
|---------|------|
| `npm run db:migrate` | Local dev only — creates new migration files |
| `npm run db:deploy`  | After schema changes — applies to Supabase |
| `npm run db:seed`    | Optional — populates demo data |
