# Technical Documentation Index

**Cognitive and Memory Support Application for People with Early-Stage Alzheimer's Disease**

*Bachelor Thesis Project — Seif*

---

## Document Set

| # | File | Contents |
|---|---|---|
| 01 | [01_system_overview.md](01_system_overview.md) | App purpose, target users, capabilities, product rationale, what the app is NOT |
| 02 | [02_scope_roles_and_product_model.md](02_scope_roles_and_product_model.md) | Patient/caregiver roles, CareLink relationship, permission model, backend-as-truth |
| 03 | [03_architecture_overview.md](03_architecture_overview.md) | Technology stack, system diagram, data flow principles, architectural decisions |
| 04 | [04_frontend_architecture.md](04_frontend_architecture.md) | Expo Router structure, feature layers, infrastructure plumbing, i18n integration |
| 05 | [05_backend_architecture.md](05_backend_architecture.md) | Modular monolith, controller/service/repo split, shared middleware, entry points |
| 06 | [06_data_model.md](06_data_model.md) | Full entity reference: User, CareLink, Reminder, ReminderEvent, Checklist, Game, Analytics, Contacts, Media |
| 07 | [07_backend_module_spec.md](07_backend_module_spec.md) | Per-module specifications: Auth, Users, CareLinks, Reminders, Checklists, Games, Events, Progress, Sync, Media, Contacts |
| 08 | [08_api_contracts.md](08_api_contracts.md) | Full API endpoint reference with request/response shapes |
| 09 | [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) | Event taxonomy, event envelope, privacy rules, thesis evaluation metrics |
| 10 | [10_progress_tracking_logic.md](10_progress_tracking_logic.md) | Derived metrics, adherence logic, streak computation, escalation alerts |
| 11 | [11_reminders_checklists_games_design.md](11_reminders_checklists_games_design.md) | Conceptual relationship, simple vs. guided reminders, template/run distinction, games |
| 12 | [12_notifications_sync_and_local_cache.md](12_notifications_sync_and_local_cache.md) | Local scheduling, bootstrap sync, incremental sync, SQLite cache |
| 13 | [13_media_handling_and_delivery.md](13_media_handling_and_delivery.md) | Upload architecture, URL management, phone-vs-localhost problem, limitations |
| 14 | [14_security_permissions_and_access_control.md](14_security_permissions_and_access_control.md) | Auth model, JWT, careLinkGuard, permission enforcement, privacy |
| 15 | [15_localization_and_arabic_support.md](15_localization_and_arabic_support.md) | Arabic as first-class requirement, RTL layout, numeral formatting, language in analytics |
| 16 | [16_setup_runbook_and_environment.md](16_setup_runbook_and_environment.md) | Setup steps, environment variables, ngrok, database migrations, common issues |
| 17 | [17_known_limitations_current_status_and_future_work.md](17_known_limitations_current_status_and_future_work.md) | Fully implemented, partially implemented, planned, architectural strengths, next priorities |

---

## Key Thesis-Ready Sections

If you are writing your thesis, these documents map to thesis chapters as follows:

| Thesis Chapter | Primary Documents |
|---|---|
| System Analysis / Requirements | 01, 02 |
| Architecture | 03, 04, 05 |
| Data Model | 06 |
| Implementation | 07, 08, 11, 12, 13 |
| Evaluation / Instrumentation | 09, 10 |
| Accessibility / Localization | 15 |
| Security | 14 |
| Limitations and Future Work | 17 |

---

*Generated: 2026-04-25. Aligned with actual codebase implementation at time of generation.*
