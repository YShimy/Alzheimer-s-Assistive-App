# 16 — Setup, Runbook, and Environment

---

## 1. Purpose of This Runbook

This file describes the **current practical setup path** for developing and testing the project. It should be read as an operational guide for the present prototype, not as a claim that deployment/distribution is already fully production-ready.

---

## 2. Repository Layout

```text
cognitive-support-app/
  backend/
  mobile/
  docs/
  PROJECT_BLUEPRINT.md
  REMOTE_TESTING.md
```

### Main implementation anchors

- backend entry: `backend/src/app/server.ts`
- backend route registration: `backend/src/app/routes.ts`
- database schema: `backend/prisma/schema.prisma`
- mobile route entry points: `mobile/app/`
- mobile API and infrastructure code: `mobile/src/infrastructure/`

---

## 3. Current Local Development Assumptions

The present prototype is easiest to run in a local development environment with:

- Node.js
- npm
- PostgreSQL
- Expo tooling
- a physical phone or emulator/simulator depending on platform

### Important current-version note

Some parts of the system still behave differently depending on whether the app is tested:

- in a laptop browser
- in Expo Go on a phone
- with LAN access
- with a public/tunneled backend URL

So environment configuration and base URLs must be treated carefully.

---

## 4. Backend Setup

### Install dependencies

```bash
cd backend
npm install
```

### Environment variables

Typical backend environment variables include:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` if Google auth is used
- `API_DEVICE_URL` for LAN-style device access during development
- `API_PUBLIC_URL` for public/tunneled backend access during remote testing
- SMTP variables if email verification is enabled

### Current implementation note

The exact env names should always be checked against:

- `backend/.env.example`
- backend shared config/env parsing code in `backend/src/shared/config/`

This is safer than treating the examples in this document as immutable.

### Database setup

Typical current workflow:

```bash
npx prisma migrate dev
npx prisma studio
```

### Start backend

```bash
npm run dev
```

---

## 5. Mobile Setup

### Install dependencies

```bash
cd mobile
npm install
```

### Environment variables

Typical mobile environment uses an Expo public API base URL such as:

- `EXPO_PUBLIC_API_URL=http://localhost:4000/api` for web-only local browser testing
- `EXPO_PUBLIC_API_URL=http://LAN-IP:4000/api` for same-network phone testing
- `EXPO_PUBLIC_API_URL=https://PUBLIC-OR-TUNNELED-URL/api` for remote device testing

### Important current-version note

`localhost` is not appropriate for physical phone testing unless the app is running as web in the same machine browser. Physical devices need a reachable LAN or public URL.

### Start Expo

```bash
npx expo start
```

Optional LAN-focused dev mode:

```bash
npx expo start --lan
```

---

## 6. Remote / Device Testing Notes

The current prototype may use one of these approaches:

1. **same-network LAN testing**
2. **public/tunneled backend testing**
3. **more realistic remote distribution/testing paths** as the project evolves

### Media-specific note

Because uploaded media has historically been stored locally and served from development URLs, phone testing has required extra care around:

- public URL generation
- LAN-reachable media base URLs
- restamping old media URLs when backend base changes

See also:

- `13_media_handling_and_delivery.md`
- `REMOTE_TESTING.md`

---

## 7. Migration / Change Workflow

When schema changes are made:

```bash
cd backend
npx prisma migrate dev --name describe-your-change
```

For deployment-style migration application:

```bash
npx prisma migrate deploy
```

For local reset during development only:

```bash
npx prisma migrate reset
```

---

## 8. Known Operational Limitations

1. **Remote testing can still be environment-sensitive.** Backend/public URL/media delivery setup matters.
2. **Phone testing and laptop-browser testing are not equivalent.** Media and localhost behavior differ.
3. **Expo Go is useful for development, but not every behavior should be treated as final production-style deployment behavior.**
4. **Some setup steps still depend on manual account/environment configuration.**

---

## 9. Documentation Use Note

This runbook should be used as a practical starting guide, but the final source of truth for exact variable names and scripts remains the current repository configuration.
