# 16 — Setup, Runbook, and Environment

---

## 1. Repository Structure

```
cognitive-support-app/
  backend/        ← Node.js / Express 5 backend
  mobile/         ← Expo React Native mobile app
  docs/           ← Documentation (legacy + new technical docs)
  PROJECT_BLUEPRINT.md
  REMOTE_TESTING.md
```

---

## 2. Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | v18 or v20 recommended |
| npm | v8+ |
| PostgreSQL | v14+ running locally or via a managed service |
| Expo CLI | Installed globally or via npx |
| Expo Go | Installed on your iOS or Android test device |
| ngrok (optional) | For remote device testing outside LAN |

---

## 3. Backend Setup

### 3.1 Install dependencies

```bash
cd backend
npm install
```

### 3.2 Environment configuration

Copy or create `backend/.env`:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/cognitive_support_app?schema=public"

# Auth — JWT
JWT_SECRET="change-me-to-a-long-random-secret"
JWT_EXPIRES_IN="7d"

# Google OAuth (leave empty if using email-OTP only)
GOOGLE_CLIENT_ID=""

# Public URL for media delivery (used to generate publicUrl in MediaAsset)
# For local LAN testing:
API_DEVICE_URL=http://192.168.x.x:4000
# For remote testing via ngrok or deployed host:
API_PUBLIC_URL=https://your-ngrok-or-railway-url.app

# SMTP (for OTP email delivery)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your.email@gmail.com
```

**SMTP note:** For Gmail, you must generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) rather than using your account password.

### 3.3 Database setup

Create the PostgreSQL database:
```sql
CREATE DATABASE cognitive_support_app;
```

Run Prisma migrations to create all tables:
```bash
npx prisma migrate dev
```

To inspect the schema in Prisma Studio:
```bash
npx prisma studio
```

### 3.4 Start the development server

```bash
npm run dev
```

The backend will start on `http://localhost:4000`. Startup output confirms database connectivity and the listening port via Pino logs.

### 3.5 Verify startup

```bash
curl http://localhost:4000/api/auth/me
# Expected: 401 Unauthorized (no token)
```

---

## 4. Mobile App Setup

### 4.1 Install dependencies

```bash
cd mobile
npm install
```

### 4.2 Environment configuration

Create `mobile/.env` (Expo automatically reads `EXPO_PUBLIC_*` prefixed variables):

```env
# Backend API URL — must be reachable from the device
EXPO_PUBLIC_API_URL=http://localhost:4000/api

# For physical device testing on the same LAN:
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api

# For remote testing via ngrok:
EXPO_PUBLIC_API_URL=https://your-ngrok-url.app/api
```

**Important:** The `EXPO_PUBLIC_API_URL` must be reachable from the device running the app. `localhost` only works when running on the Expo web target (browser). Physical devices must use the LAN IP or a public URL.

### 4.3 Start Expo

```bash
npx expo start
```

This opens the Expo dev tools. Scan the QR code with Expo Go on your device or press `w` to open in the browser.

For development with a physical device on the same network:
```bash
npx expo start --lan
```

---

## 5. Running Both Simultaneously

In separate terminals:

**Terminal 1 — Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 — Mobile:**
```bash
cd mobile && npx expo start
```

---

## 6. Remote Device Testing (ngrok)

When testing on a physical device that is NOT on the same local network as the development machine (e.g., testing from a different location):

1. Start ngrok:
   ```bash
   ngrok http 4000
   ```
2. Copy the generated HTTPS URL (e.g., `https://diaphragm-angular.ngrok-free.dev`).
3. Set in `backend/.env`:
   ```env
   API_PUBLIC_URL=https://diaphragm-angular.ngrok-free.dev
   ```
4. Set in `mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://diaphragm-angular.ngrok-free.dev/api
   ```
5. Restart the backend.
6. Run `POST /api/media/restamp-urls` to update existing media URLs to use the new tunnel URL:
   ```bash
   curl -X POST https://diaphragm-angular.ngrok-free.dev/api/media/restamp-urls \
     -H "Authorization: Bearer <admin_token>"
   ```
7. Restart the Expo dev server.

See `REMOTE_TESTING.md` in the project root for the full ngrok testing guide.

---

## 7. Database Migration Flow

When the Prisma schema changes:

**Development (creates and applies migration):**
```bash
cd backend
npx prisma migrate dev --name describe-your-change
```

**Production (applies existing migrations without creating new):**
```bash
npx prisma migrate deploy
```

**Resetting the database (CAUTION: deletes all data):**
```bash
npx prisma migrate reset
```

---

## 8. Key Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No (default: 4000) | HTTP server port |
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key (use a long random string) |
| `JWT_EXPIRES_IN` | No (default: 7d) | JWT expiry duration |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (if using Google Sign-In) |
| `API_PUBLIC_URL` | Recommended | Public-accessible backend URL for media delivery |
| `API_DEVICE_URL` | Optional | LAN IP URL for same-network device testing |
| `SMTP_HOST` | Yes (for OTP) | SMTP server host |
| `SMTP_PORT` | Yes (for OTP) | SMTP server port |
| `SMTP_USER` | Yes (for OTP) | SMTP authentication username |
| `SMTP_PASS` | Yes (for OTP) | SMTP authentication password (App Password for Gmail) |
| `SMTP_FROM` | Yes (for OTP) | Sender email address |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL (must be device-accessible) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | No | Google Sign-In web client ID |

---

## 9. Common Startup Issues

| Issue | Cause | Resolution |
|---|---|---|
| `Could not connect to database` | PostgreSQL not running or wrong credentials | Start PostgreSQL; check `DATABASE_URL` |
| `fetch failed` in Expo | `EXPO_PUBLIC_API_URL` set to `localhost` on physical device | Use LAN IP or ngrok URL |
| OTP email not received | SMTP credentials wrong or App Password not configured | Check `SMTP_*` variables; use Gmail App Password |
| Media images not loading on device | `API_PUBLIC_URL` not set or set to localhost | Set `API_PUBLIC_URL` to ngrok URL; run restamp-urls |
| `prisma migrate dev` fails | Database not created | Create the database first via `psql` |
| Expo QR code does not connect | Device not on same network as dev machine | Use `--tunnel` or ngrok |

---

## 10. Build and Distribution Notes

The application is currently configured for development and research use only. Production builds would require:

1. **EAS Build:** Use Expo's EAS Build service for production iOS and Android binaries.
2. **Backend deployment:** Deploy to a managed service (Railway, Render, Fly.io) with a persistent PostgreSQL database.
3. **Media storage migration:** Move from local filesystem to S3-compatible object storage.
4. **Push notification infrastructure:** Configure FCM (Android) and APNs (iOS) credentials for server-side push delivery.
5. **Environment hardening:** Rotate JWT_SECRET, disable development-only routes, configure strict CORS.
6. **HTTPS enforcement:** Ensure all production traffic uses HTTPS.

These are documented as future work in [17_known_limitations_current_status_and_future_work.md](17_known_limitations_current_status_and_future_work.md).

---

*Cross-references: [13_media_handling_and_delivery.md](13_media_handling_and_delivery.md) for media URL configuration; [17_known_limitations_current_status_and_future_work.md](17_known_limitations_current_status_and_future_work.md) for production deployment gaps.*
