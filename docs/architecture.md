# Architecture Overview

## Project

**Cognitive and Memory Support Application for People with Early-Stage Alzheimer's Disease**

A mobile-first assistive app designed to support daily functioning through orientation, reminders, checklists, light cognitive engagement, and caregiver support.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo (React Native), TypeScript, Expo Router |
| Backend | Node.js, TypeScript, Express 5 |
| Database | PostgreSQL + Prisma ORM |
| Local Cache | expo-sqlite (minimal) |
| Auth | Google Sign-In → JWT |
| Real-time | Socket.IO |
| Logging | Pino |
| Validation | Zod |

## High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                Mobile App                   │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Patient  │ │Caregiver │ │   Auth     │  │
│  │   Views  │ │  Views   │ │   Flow     │  │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       │             │             │          │
│  ┌────┴─────────────┴─────────────┴──────┐  │
│  │        Infrastructure Layer           │  │
│  │  API Client · SQLite · SecureStore    │  │
│  │  Notifications · Events · Realtime    │  │
│  └───────────────────┬───────────────────┘  │
└──────────────────────┼──────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────┼──────────────────────┐
│              Backend API                     │
│  ┌───────────────────┴───────────────────┐  │
│  │         Express 5 + Socket.IO         │  │
│  └───────────────────┬───────────────────┘  │
│  ┌───────────────────┴───────────────────┐  │
│  │         Module Layer                  │  │
│  │  Auth · Users · CareLinks · Reminders │  │
│  │  Checklists · Games · Events          │  │
│  │  Progress · Sync                      │  │
│  └───────────────────┬───────────────────┘  │
│  ┌───────────────────┴───────────────────┐  │
│  │      Shared Layer                     │  │
│  │  Config · DB · Errors · Logger · Zod  │  │
│  └───────────────────┬───────────────────┘  │
│                      │                       │
│              ┌───────┴────────┐              │
│              │  PostgreSQL    │              │
│              │  (Prisma ORM)  │              │
│              └────────────────┘              │
└──────────────────────────────────────────────┘
```

## Data Flow Principles

1. **Backend is source of truth** — all persistent data lives in PostgreSQL
2. **Mobile SQLite is a cache** — for offline resilience and fast reads
3. **Reminders are scheduled locally** — on-device for reliability
4. **Caregiver changes sync through backend** — then push to patient device
5. **Analytics are centralized** — all telemetry flows to backend

## Roles

- **Patient**: uses the app directly for daily orientation, reminders, checklists, games
- **Caregiver**: manages the patient's reminders and checklists remotely, views progress

## Non-Functional Requirements

- Low cognitive load UI (big buttons, minimal steps, supportive wording)
- No medical or diagnostic claims
- Research-friendly analytics for thesis evaluation
- Privacy-first: no face recognition, manual photo labels only
