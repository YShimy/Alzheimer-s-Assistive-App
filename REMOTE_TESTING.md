# Remote Testing Runbook — Cognitive Sanctuary

How to move from "same-network Expo Go" to real remote usage.

---

## Quick Summary

There are 3 problems to solve for remote testing. All 3 must be addressed:

| Problem | Solution |
|---|---|
| App delivery | EAS internal distribution build (preview profile) |
| Backend access | Deploy backend publicly (Railway) OR use ngrok tunnel |
| Media access | Set `API_PUBLIC_URL` in backend `.env` |

---

## Option A — Quick Remote Demo (Tunnel, No Deployment)

Best for: quick demos for your doctor, same backend running on your laptop, no server costs.

**Limitation:** The ngrok URL changes every time you restart. Not suitable for distributing to testers who install the app independently.

### 1. Start backend normally
```bash
cd backend
npm run dev
```

### 2. Start Expo with tunnel
```bash
cd mobile
npx expo start --tunnel
```
Expo will print a `exp+cognitive-sanctuary://` QR code AND a `https://xxxx.ngrok-free.app` tunnel URL.

### 3. Update backend `.env` with the ngrok URL
```env
API_PUBLIC_URL=https://xxxx-xx-xx.ngrok-free.app
```
Restart backend (`Ctrl+C` → `npm run dev`).

### 4. Fix existing media URLs in the database
On Windows (PowerShell):
```powershell
$login = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/dev-login" -Method Post -ContentType "application/json" -Body '{"role": "CAREGIVER"}'
Invoke-RestMethod -Uri "http://localhost:4000/api/media/restamp-urls" -Method Post -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

On Mac/Linux (bash):
```bash
curl -X POST http://localhost:4000/api/media/restamp-urls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
Get `YOUR_JWT_TOKEN` by logging into the app and copying it from logs, or use the app's login API directly.


### 5. Have tester scan the QR code with Expo Go
- iOS: install Expo Go from App Store → scan QR
- Android: install Expo Go from Play Store → scan QR

> ⚠️ The tester needs Expo Go installed. This is fine for the doctor demo.

---

## Option B — Proper Remote Build (EAS, Recommended for Realistic Demo)

Best for: giving the doctor/testers an actual installable app that works without Expo Go.

### Prerequisites
- Free Expo account: https://expo.dev/signup
- EAS CLI: `npm install -g eas-cli`

### Step 1 — Deploy the backend publicly

The simplest free option is **Railway** (https://railway.app):

1. Create account at railway.app
2. New project → Deploy from GitHub → select your repo
3. Set environment variables (same as your `backend/.env` but with production DB)
4. Railway gives you a public URL like: `https://cognitive-sanctuary-backend.up.railway.app`

Set in `backend/.env` (or Railway dashboard):
```env
API_PUBLIC_URL=https://cognitive-sanctuary-backend.up.railway.app
DATABASE_URL=postgresql://...  # Railway PostgreSQL add-on
JWT_SECRET=your-real-secret
```

After deploying, fix existing media URLs once:
```bash
curl -X POST https://cognitive-sanctuary-backend.up.railway.app/api/media/restamp-urls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 2 — Set up EAS

```bash
cd mobile
eas login          # log in with your Expo account
eas init           # creates/links the project, gives you a real projectId
```

Copy the `projectId` from the output into `app.json`:
```json
"extra": {
  "eas": { "projectId": "YOUR_ACTUAL_UUID_HERE" }
}
```
Also update the `updates.url` field in `app.json`.

### Step 3 — Configure backend URL in eas.json

Edit `mobile/eas.json`, set `preview.env.EXPO_PUBLIC_API_URL`:
```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_URL": "https://cognitive-sanctuary-backend.up.railway.app/api"
  }
}
```

### Step 4 — Build the preview APK/IPA

**Android APK (easiest — no Apple account needed):**
```bash
cd mobile
eas build --profile preview --platform android
```
EAS gives you a download link for the `.apk`. Send it to testers directly.
On Android: Settings → Install unknown apps → allow browser → open APK link.

**iOS IPA (needs Apple Developer account OR TestFlight OR Ad Hoc):**
```bash
eas build --profile preview --platform ios
```
> ⚠️ iOS requires a paid Apple Developer account ($99/year) to distribute outside the App Store/TestFlight, OR you use Apple's free provisioning (limited to personal devices registered via UDID).

For the doctor/thesis demo: use the **Android APK path** first — it's free and instant.

### Step 5 — Share with testers

- Android: share the `.apk` download URL from EAS build output
- iOS: register tester's UDID with Apple and rebuild with their device included (or use TestFlight if you have a Developer account)

---

## Local Dev Mode (unchanged from before)

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Mobile (same-network Expo Go)
cd mobile
# Update EXPO_PUBLIC_API_URL in mobile/.env to your LAN IP first
npx expo start
```

Find your LAN IP:
- Windows: `ipconfig` → look for IPv4 under your Wi-Fi adapter
- Set in `mobile/.env`: `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000/api`
- Set in `backend/.env`: `API_DEVICE_URL=http://YOUR_LAN_IP:4000`

> When switching from home Wi-Fi to hotspot, update both `.env` files and restart both servers.

---

## Environment Variables Reference

### `backend/.env`

| Variable | What it does | Required for remote |
|---|---|---|
| `API_PUBLIC_URL` | Public URL used in media asset URLs returned to phones | **YES** |
| `API_DEVICE_URL` | LAN IP for same-network Expo Go dev | No (only for LAN dev) |
| `DATABASE_URL` | PostgreSQL connection string | YES |
| `JWT_SECRET` | JWT signing key | YES |
| `SMTP_*` | Email sending credentials | For email verification |

### `mobile/.env`

| Variable | What it does | Required |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Backend URL the mobile app talks to | **YES — must match backend** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client | Only if using Google auth |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In iOS client | Only if using Google auth on iOS |

---

## What You Must Fill In Manually

1. **Railway/public backend URL** → `API_PUBLIC_URL` in `backend/.env`
2. **Same URL + `/api`** → `EXPO_PUBLIC_API_URL` in `mobile/.env` and `eas.json` preview profile
3. **EAS project ID** → run `eas init` → copy UUID → update `app.json`
4. **JWT_SECRET** → set a real random string (not "change-me") for production
5. **Google OAuth client IDs** → only if enabling Google Sign-In

---

## Checklist: Is the Remote Setup Working?

- [ ] `curl https://YOUR_BACKEND/api/health` returns `{"status":"ok"}`
- [ ] Media test: `curl https://YOUR_BACKEND/uploads/some-file.jpg` returns image bytes (not 404)
- [ ] App on phone can log in
- [ ] App on phone can load contacts/reminders (API reachable)
- [ ] App on phone can display uploaded images (media URLs resolve)
- [ ] App works with phone on mobile data (not Wi-Fi)
