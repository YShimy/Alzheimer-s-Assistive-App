# 04 — Feature Guide: Reminders

Reminders help the patient notice when something should be done.

They are one of the core parts of the app.

---

## 1. Simple and Guided Reminder Use

In the product design, reminders can be used in two broad ways:

### Simple reminder
Used for one-step tasks.

Examples:

- drink water
- call someone
- take a prepared medication dose

The patient acts on the reminder directly.

### Guided reminder
Used for tasks that may need a checklist or more support.

Examples:

- morning routine
- making coffee
- getting ready to go out

In builds where this linkage is implemented, the reminder may offer **Start now** and open a checklist.

---

## 2. Reminder Actions

Depending on the current version and reminder type, reminder actions may include:

- **Done**
- **Snooze**
- **Skip**
- **Start now** for guided flows where supported

These actions help the app and caregiver understand what happened.

---

## 3. Reminder Priority

Some versions of the reminder system may include reminder priority, such as:

- normal
- high
- critical

This is intended to help distinguish between everyday reminders and more important ones.

Current reminder-priority behavior should be checked against the specific build being used, especially for caregiver alerts or detailed progress breakdowns.

---

## 4. Helpful Caregiver Practice

When creating reminders:

- keep wording short
- avoid too many reminders at once
- use a checklist instead of many separate reminders for one complex routine
- try to match reminder times to the patient’s real daily rhythm

---

## 5. Current-Version Note

Reminder behavior is a major part of the app, but some advanced logic may still be evolving depending on the build, including:

- checklist-linked reminder flows
- priority-aware progress details
- escalation/alert behavior for the caregiver
- remote/device-specific notification differences
