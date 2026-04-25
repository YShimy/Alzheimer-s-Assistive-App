# 15 — Localization and Arabic Support

---

## 1. Why This Area Matters

Arabic support is a meaningful product and technical capability in this project, not a minor settings detail.

The application is intended for patient and caregiver use in contexts where Arabic usability is important. In that context, language support affects:

- readability
- comfort and familiarity
- cognitive load
- caregiver/patient adoption
- accessibility of the app in real daily use

This is especially relevant because many earlier digital health or assistive tools have been more strongly English-oriented than Arabic-oriented.

---

## 2. Locked Intended Design

The intended localization model includes:

- support for **Arabic and English**
- persisted user language preference
- appropriate RTL behavior for Arabic interfaces
- language awareness in user profile and event telemetry
- wording choices that remain calm, supportive, and cognitively accessible in both languages

Arabic support is therefore part of the product model, user model, and usability strategy.

---

## 3. Current Implementation

The current prototype includes Arabic/English support in the core product model and the main implemented app flows.

This should be described carefully as:

- **Arabic and English are supported in the current codebase across the main flows that have been implemented and localized**
- **RTL behavior is part of the current implementation approach**
- **language is treated as a real profile/application concern rather than as a cosmetic afterthought**

More specifically, current implementation/documented design already indicates language appears in areas such as:

- user profile / user model
- authentication/bootstrap response shapes where language is returned
- event telemetry fields where language may be recorded for evaluation context

### Important wording note

This file intentionally avoids claiming that “every string in every possible edge case is fully translated and finalized.” A safer and more accurate interpretation is that the app currently includes Arabic support across the main implemented flows and treats Arabic as a first-class product capability.

---

## 4. Traceability to Current Code / Contracts

Arabic/English support should be cross-checked in locations such as:

- user/profile-related backend contracts and schema handling
- mobile language or i18n infrastructure under `mobile/src/...`
- route groups and screens under `mobile/app/...`
- event payload structures where language is included

Relevant implementation anchors may include:

- frontend localization/i18n files and language state handling
- user/profile update flows
- event logging schema or builders

If a thesis section needs implementation-level evidence, those code locations should be inspected directly.

---

## 5. Usability and Accessibility Implications

Arabic support matters for more than translation. It affects:

- layout direction (RTL)
- visual scanning patterns
- comfort for patients using their stronger language
- caregiver flexibility when caregiver and patient prefer different languages
- cognitive accessibility by reducing extra mental burden caused by language mismatch

For this reason, Arabic support should be discussed in the thesis as part of **accessibility, localization, and adoption**, not just as a UI preference toggle.

---

## 6. Known Gaps / Current Limitations

1. **Localization completeness should still be validated against the live app.** The main implemented flows may be localized while some later-added or edge-case strings may still need checking.
2. **RTL behavior should be verified in every newly added screen.** A core RTL mechanism may exist, but feature growth can still introduce layout regressions.
3. **Terminology consistency still matters.** Reminder, checklist, progress, and contact/memory-aid terminology should stay stable across both languages.

---

## 7. Thesis Use Note

This file is important for thesis framing because it supports the argument that the system was designed with **Arabic-language usability as a first-class concern**, which is relevant both practically and academically.
