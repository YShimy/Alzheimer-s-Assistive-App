# 10 — Known Limits & Current Version Notes

The Cognitive and Memory Support App is currently a **research prototype** for a university bachelor project.

It already includes meaningful support features, but some areas are still evolving.

---

## What the Current Version Already Supports Well

The current prototype already includes strong foundations such as:

- Arabic/English support in the main implemented flows
- caregiver/patient linking through the CareLink model
- reminders and checklists as core support tools
- progress tracking in a prototype form
- lightweight games and engagement tracking

These strengths are real, but they should still be interpreted in the context of an actively evolving prototype.

---

## Known Technical / Product Limits in the Current Version

### 1. Media and phone testing
If photos or videos are uploaded during local development, device access may still depend on how the backend and media URLs are configured. This has been one of the known prototype limitations during phone testing.

### 2. Offline behavior is still limited
Reminder alarms may still appear locally on the device, but saving actions and syncing them back to the caregiver/progress view may require network access in the current version.

### 3. Immediate synchronization is still evolving
Some caregiver-side changes may not appear instantly on the patient device without refresh, reopen, or sync.

### 4. Some advanced reminder/progress behaviors may still be partial
Depending on the current build, advanced features such as reminder priority handling, escalation alerts, or more detailed progress logic may still be in progress rather than completely polished.

### 5. Distribution/testing environment matters
The prototype may behave differently depending on whether it is being used:

- on a laptop browser
- in Expo Go
- on a physical phone with LAN access
- in a more public/remote test setup

---

## What to Keep in Mind

This app should be used as a supportive companion tool in its current form.

It already demonstrates the main product direction well, but it is still moving toward a more complete real-world deployment and polish level.
