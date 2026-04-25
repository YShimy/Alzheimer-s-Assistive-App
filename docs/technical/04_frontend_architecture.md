# 04 — Frontend Architecture

---

## 1. Locked Intended Design

The mobile application is built using **Expo and React Native**, organized around a feature-based folder structure rather than a layer-based structure. It uses **Expo Router** for file-based navigation, providing a clean separation of screens from underlying business logic.

### Design Principles
*   **Separation of Concerns:** UI components should not contain data-fetching logic.
*   **Offline Tolerance:** The frontend must cache definitions (reminders, checklists) locally in SQLite so the patient can view their day without an active internet connection.
*   **Role-Based UI:** Patient screens and Caregiver screens are physically separated in the routing structure to prevent accidental crossover.
*   **Localization First:** The UI must support dynamic RTL flipping for Arabic via `I18nManager`.

---

## 2. Current Implementation State

The frontend architecture is implemented in the `mobile/` directory and is actively serving the current prototype.

### Core Structure

| Directory | Purpose | Traceability |
|---|---|---|
| `app/` | File-based routing (screens) | `mobile/app/(patient)/`, `mobile/app/(caregiver)/` |
| `src/features/` | Feature-specific logic & UI | `mobile/src/features/reminders/`, `mobile/src/features/checklists/` |
| `src/shared/` | Cross-feature utilities | `mobile/src/shared/i18n/`, `mobile/src/shared/components/` |
| `src/infrastructure/`| Core services (storage, API) | `mobile/src/infrastructure/storage/sqlite.ts`, `mobile/src/infrastructure/notifications/` |

### Key Modules Implemented
1.  **API Client:** Built on Axios, intercepting requests to inject the JWT from `expo-secure-store`. *(Location: `mobile/src/infrastructure/api/client.ts`)*
2.  **i18n Engine:** Uses `i18next` and `react-i18next`, with resources stored in `mobile/src/shared/i18n/locales/`. It forces RTL layout via `I18nManager`.
3.  **Local Notifications:** Schedules local OS-level alarms using `expo-notifications`. *(Location: `mobile/src/infrastructure/notifications/notifications.ts`)*
4.  **Local Storage:** Uses `expo-sqlite` for caching reminder and checklist definitions. *(Location: `mobile/src/infrastructure/storage/sqlite.ts`)*

---

## 3. Known Limitations / Future Work

While the structure is solid, certain infrastructure components are not fully realized in the current codebase:

*   **Sync Engine Incomplete:** The intended `syncEngine.ts` and `syncQueue.ts` modules for offline mutation tracking are partially stubbed. Actions like "Done" or "Snooze" currently fail or are lost if executed completely offline.
*   **Realtime Subscriptions:** The Socket.IO client intended to listen for caregiver updates is not fully integrated into the React component lifecycle.
*   **State Management:** The app relies heavily on local component state and direct API fetches. A formal global state manager (like Zustand or Redux) is planned for the future to reduce unnecessary re-renders when navigating between tabs.
