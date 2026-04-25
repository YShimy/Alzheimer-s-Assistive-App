# 15 — Localization and Arabic Support

---

## 1. Why Arabic Support Matters in This Project

Arabic is one of the most widely spoken languages in the world, with over 400 million native speakers. In the regional context where this application is developed and evaluated (Egypt and the broader Arab world), Arabic is the primary language of the target patient population.

Several important observations motivate Arabic as a first-class requirement rather than an optional extension:

**1. Cognitive accessibility through language.** Patients with early-stage Alzheimer's disease are best supported in their native language. Forcing Arabic-speaking patients to interact with an English-only app introduces an unnecessary and exclusionary cognitive burden. The supportive design philosophy of this application demands language accessibility as a fundamental requirement.

**2. Caregiver accessibility.** Many caregivers for elderly Arabic-speaking patients are themselves Arabic speakers. A caregiver who cannot comfortably use the app in Arabic will not use it effectively, undermining the caregiver support model.

**3. Gaps in prior work.** Many cognitive support technologies reviewed in the literature were developed for English-speaking populations and do not natively support Arabic. RTL layouts, Arabic numerals (Eastern Arabic), and context-appropriate phrasing require deliberate engineering that is often absent from English-first tools. This application treats Arabic support as a meaningful technical and accessibility contribution, not merely an afterthought.

**4. Research validity.** If the application's evaluation only covers English-speaking users, the thesis findings are limited to that population. Arabic support allows the evaluation to be relevant to the actual target demographic.

---

## 2. Supported Languages

The application currently supports exactly two languages:

| Code | Language | Script Direction | Notes |
|---|---|---|---|
| `en` | English | LTR (Left-to-Right) | Default fallback |
| `ar` | Arabic | RTL (Right-to-Left) | Full UI support |

The system is designed for extension. Adding a third locale would require creating a new JSON file under `src/shared/i18n/locales/` and registering it in the i18next configuration.

---

## 3. How Language is Stored and Selected

### 3.1 User model language preference

The `User` entity has a `language` field (string, `en` or `ar`). This is the user's persisted language preference stored in PostgreSQL. When the user changes their language, it is updated via `PATCH /api/users/me` with `{ language: "ar" }`.

### 3.2 Device-level persistence

Independently of the backend User record, the selected language is also persisted locally on the device in SecureStore (iOS/Android) or localStorage (web) under the key `APP_LANG`. This allows the language to be restored immediately on app launch without waiting for a network fetch.

### 3.3 Language detection on startup

The i18n system uses a custom `languageDetector` plugin for i18next:

1. On app startup, the detector reads `APP_LANG` from SecureStore.
2. If a saved value exists, it is used immediately.
3. If no saved value exists, the device locale is checked via `expo-localization`.
4. If the device locale resolves to `ar` (Arabic), Arabic is selected.
5. If none of the above produce a valid language, `en` (English) is the fallback.

This cascade ensures the user's explicit choice is always honoured first, device locale is respected second, and English is the safe default third.

### 3.4 Language change flow

When the user changes language in the app:

1. `setAppLanguage(language)` is called from `src/shared/i18n/index.ts`.
2. `I18nManager.forceRTL(isRtl)` is called to switch the layout direction.
3. `i18n.changeLanguage(language)` updates the active translation.
4. `APP_LANG` is saved to SecureStore for persistence.
5. `PATCH /api/users/me` is called to persist the preference to the backend User record.

The layout direction change may require a full app reload on some platforms (specifically Android) to take effect, because React Native's RTL mode is a top-level process flag. On iOS, the layout typically switches without a reload.

---

## 4. Translation Architecture

### 4.1 i18next + react-i18next

The i18n infrastructure uses:
- **i18next** for translation resource management and language switching.
- **react-i18next** for React integration, providing the `useTranslation()` hook.
- Static JSON resource files bundled at build time (no dynamic loading from server).

```typescript
// Usage in any component
const { t, i18n } = useTranslation();

// Access a translation
t('patientHome.goodMorning')

// Check current language
i18n.language // 'en' or 'ar'

// Format numbers with locale-appropriate numerals
new Intl.NumberFormat(i18n.language).format(number)
```

### 4.2 Translation file structure

Both `en.json` and `ar.json` are structured with a flat namespace hierarchy using feature-section prefixes:

```json
{
  "common": { "cancel": "Cancel", "save": "Save", ... },
  "auth": { "login": "Login", "email": "Email", ... },
  "patientHome": { "goodMorning": "Good morning", ... },
  "patientReminders": { "title": "My Reminders", ... },
  "caregiverHome": { "dashboard": "Dashboard", ... },
  "caregiverTabs": { "dashboardTitle": "Home", ... },
  "caregiverPatients": { "revokeConfirm": "...", ... },
  "games": { "title": "Games", ... }
}
```

The namespace keys are organised by screen/feature area for maintainability. All string resources are managed exclusively in these files; no hardcoded strings should appear in screen components.

### 4.3 Coverage

At the current implementation stage, the following areas are fully translated to Arabic:

- Auth screens (login, OTP, signup, role selection, complete profile)
- Patient home/today screen
- Patient reminders screen (list, actions, creation form)
- Patient checklist screen (list, run view, step completion)
- Patient games screen (hub, game HUD, overlays)
- Patient progress screen
- Caregiver home/dashboard
- Caregiver patients list
- Caregiver manage reminders
- Caregiver manage checklists
- Caregiver progress screen
- Contacts screen
- Bottom tab navigation labels (all tabs)
- Common UI elements (buttons, alerts, empty states)

---

## 5. RTL Layout Support

Arabic text is written and read from right to left. Displaying Arabic in an LTR layout is not just cosmetically wrong — it actively increases cognitive load by reversing reading order.

The application implements RTL support at the layout level:

### 5.1 `I18nManager.forceRTL(true)`

When Arabic is selected, `I18nManager.forceRTL(true)` and `I18nManager.allowRTL(true)` are called. This instructs React Native to mirror the flexbox layout direction for the entire app — items that were on the left appear on the right, and vice versa.

This is a process-level flag in React Native. It causes the entire component tree to reflow in the opposite direction, which is the correct approach for a genuine RTL experience rather than a cosmetic text alignment change.

### 5.2 What RTL means for specific elements

| Element | LTR | RTL (Arabic) |
|---|---|---|
| Navigation arrows | → forward, ← back | ← forward, → back |
| Text alignment | Left-aligned | Right-aligned |
| Icon positions (lead/trail) | Icon on left, text on right | Icon on right, text on left |
| List items | Expand left to right | Expand right to left |
| Form fields | Input area on right | Input area on left |

React Native's built-in flexbox RTL mirroring handles most of these automatically. Custom layouts that use absolute positioning or explicit `left`/`right` style properties may require explicit RTL handling.

### 5.3 Arabic numeral formatting

When displaying numbers (streak counts, progress percentages, reminder counts), the app uses `Intl.NumberFormat(i18n.language)` to format numbers in the locale-appropriate style. For Arabic (`ar`), this produces Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) rather than Western Arabic numerals (0123456789), which is the expected format for Arabic-speaking users.

```typescript
new Intl.NumberFormat(i18n.language).format(85) // "٨٥" in Arabic, "85" in English
```

---

## 6. Language in the Analytics Model

The `AnalyticsEvent` entity includes a `language` field (`en` or `ar`) that records which locale the user was operating in at the time of the event.

This enables:
- Comparison of feature adoption rates between Arabic and English users.
- Identification of any features that Arabic-speaking users engage with differently.
- Evidence that the Arabic interface is genuinely being used (not just available).

For thesis evaluation purposes, this data point allows the analysis to distinguish language-specific usage patterns, which is directly relevant to the accessibility contribution claimed by the project.

---

## 7. Implications for the User Profile

The User entity's `language` field serves multiple purposes:
- It is the source of truth for the user's language preference stored in the backend.
- It is synced to the mobile client via the bootstrap payload and `/api/auth/me`.
- It is updated by the language toggle component and persisted via `PATCH /api/users/me`.
- It is read by the mobile i18n system on startup to restore the user's preference.

This design means that if a user logs in on a new device, their language preference is automatically restored from the backend — they do not have to reconfigure the language on each device.

---

## 8. Known Gaps and Future Work

| Area | Status |
|---|---|
| Full RTL layout verification on all screens | Most screens tested; some edge cases with absolute-positioned elements may require manual RTL style overrides |
| Eastern Arabic numerals in all contexts | Implemented for progress numbers; edge cases in form inputs and date formatting may still use Western numerals |
| Arabic-specific typography tuning | Font size and line height may need adjustment for Arabic text density |
| Third language support | The infrastructure supports it; adding a third locale requires only a new JSON file and registration |
| RTL-aware animations | Some slide/transition animations may not mirror correctly in RTL; needs verification on Android |

---

## 9. Arabic Support as a Meaningful Contribution

Within the context of assistive technologies for Alzheimer's disease, Arabic language support is documented here explicitly because:

1. Most comparable tools in the research literature do not natively support Arabic.
2. RTL layout support is non-trivial in mobile development and requires deliberate engineering.
3. The combination of full translation, RTL layout, locale-appropriate numeral formatting, and persistent language preference management constitutes a comprehensive Arabic localisation implementation — not a superficial string translation.
4. The `language` field in the event model means Arabic usage is measurable, supporting the thesis claim that the application is genuinely accessible to Arabic-speaking users.

---

*Cross-references: [04_frontend_architecture.md](04_frontend_architecture.md) for i18n infrastructure; [06_data_model.md](06_data_model.md) for the User.language field; [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) for the event language field.*
