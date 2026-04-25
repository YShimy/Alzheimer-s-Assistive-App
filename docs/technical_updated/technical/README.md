# Technical Documentation Index

**Cognitive and Memory Support Application for People with Early-Stage Alzheimer's Disease**

*Bachelor Thesis Project — Seif*

---

## How to Read This Documentation Set

This technical documentation uses an **Option B** structure throughout:

- **Locked intended design** — the architecture and behavior the project is designed around
- **Current implementation** — what is present in the current codebase/prototype
- **Known gaps / future work** — what is still partial, evolving, or planned

The files below should therefore be read as **system documentation aligned to the repository**, not as a claim that every intended feature is fully complete.

---

## Document Set

| # | File | Main Focus |
|---|---|---|
| 01 | [01_system_overview.md](01_system_overview.md) | App purpose, target users, product rationale, and non-goals |
| 02 | [02_scope_roles_and_product_model.md](02_scope_roles_and_product_model.md) | Patient/caregiver roles, CareLink model, permissions, backend-as-truth principles |
| 03 | [03_architecture_overview.md](03_architecture_overview.md) | System architecture, data flow, key technology choices, intended vs current state |
| 04 | [04_frontend_architecture.md](04_frontend_architecture.md) | Expo Router structure, feature layers, infrastructure boundaries, frontend implementation traceability |
| 05 | [05_backend_architecture.md](05_backend_architecture.md) | Modular monolith design, controller/service/repo split, shared backend concerns |
| 06 | [06_data_model.md](06_data_model.md) | Core entities, relationships, ownership boundaries, current schema notes |
| 07 | [07_backend_module_spec.md](07_backend_module_spec.md) | Module responsibilities, dependencies, ownership, and non-ownership boundaries |
| 08 | [08_api_contracts.md](08_api_contracts.md) | Main API areas, route intentions, current implementation notes, validation boundaries |
| 09 | [09_event_logging_and_instrumentation.md](09_event_logging_and_instrumentation.md) | Event envelope, taxonomy, telemetry vs business truth, evaluation relevance |
| 10 | [10_progress_tracking_logic.md](10_progress_tracking_logic.md) | Derived metrics, adherence logic, streaks, comparison logic, current limitations |
| 11 | [11_reminders_checklists_games_design.md](11_reminders_checklists_games_design.md) | Relationship between reminders, checklist runs, and lightweight games |
| 12 | [12_notifications_sync_and_local_cache.md](12_notifications_sync_and_local_cache.md) | Local scheduling, sync behavior, SQLite role, offline boundaries |
| 13 | [13_media_handling_and_delivery.md](13_media_handling_and_delivery.md) | Upload architecture, URL generation, phone-vs-localhost issue, current media limitations |
| 14 | [14_security_permissions_and_access_control.md](14_security_permissions_and_access_control.md) | Authentication, authorization, CareLink enforcement, privacy boundaries |
| 15 | [15_localization_and_arabic_support.md](15_localization_and_arabic_support.md) | Arabic/English support, RTL behavior, localization considerations, current status |
| 16 | [16_setup_runbook_and_environment.md](16_setup_runbook_and_environment.md) | Setup, environment variables, local runbook, remote-testing notes |
| 17 | [17_known_limitations_current_status_and_future_work.md](17_known_limitations_current_status_and_future_work.md) | Current maturity, known gaps, planned work, future technical directions |

---

## Thesis-Oriented Reuse Map

| Thesis Area | Primary Supporting Documents |
|---|---|
| Problem framing / system scope | 01, 02 |
| Architecture and design decisions | 03, 04, 05 |
| Data model and backend structure | 06, 07 |
| Implementation details | 08, 11, 12, 13, 16 |
| Evaluation / instrumentation / progress evidence | 09, 10 |
| Localization and accessibility | 15 |
| Security and permissions | 14 |
| Limitations and future work | 17 |

---

## Traceability Expectation

Where useful, documents reference the current code structure using paths such as:

- `mobile/app/...`
- `mobile/src/...`
- `backend/src/modules/...`
- `backend/src/shared/...`
- `backend/prisma/schema.prisma`

These references are intended to make the documentation easier to map to the actual implementation during thesis writing and later maintenance.

---

*Documentation status: revised to reduce overclaiming and improve alignment with the repository at the time of generation. Remaining implementation validation should still be performed against the live code before using any single file as final thesis text.*
