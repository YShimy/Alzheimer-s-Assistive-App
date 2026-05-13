/**
 * Role constants used in application code.
 * Maps between Prisma uppercase enums and lowercase API-facing values.
 */

// API-facing lowercase values (used in JWT, API responses, contracts)
export const Role = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  ADMIN: 'admin',
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

// Prisma enum uppercase values (used internally with Prisma)
export const PrismaRole = {
  PATIENT: 'PATIENT',
  CAREGIVER: 'CAREGIVER',
  ADMIN: 'ADMIN',
} as const;

export type PrismaRoleValue = (typeof PrismaRole)[keyof typeof PrismaRole];

/** Maps a Prisma uppercase role to a lowercase API-facing role */
export function toApiRole(prismaRole: string): RoleValue {
  const map: Record<string, RoleValue> = {
    PATIENT: Role.PATIENT,
    CAREGIVER: Role.CAREGIVER,
    ADMIN: Role.ADMIN,
  };
  return map[prismaRole] ?? Role.PATIENT;
}

/** Maps a lowercase API role to a Prisma uppercase role */
export function toPrismaRole(apiRole: string): PrismaRoleValue {
  const map: Record<string, PrismaRoleValue> = {
    patient: PrismaRole.PATIENT,
    caregiver: PrismaRole.CAREGIVER,
    admin: PrismaRole.ADMIN,
  };
  return map[apiRole] ?? PrismaRole.PATIENT;
}

// Reminder category mappings
export const ReminderCategoryApi = {
  MEDICATION: 'medication',
  APPOINTMENT: 'appointment',
  TASK: 'task',
  HYDRATION: 'hydration',
  MEAL: 'meal',
  CALL: 'call',
  CUSTOM: 'custom',
} as const;

export type ReminderCategoryApiValue = (typeof ReminderCategoryApi)[keyof typeof ReminderCategoryApi];

export function toApiReminderCategory(prisma: string): ReminderCategoryApiValue {
  const v = prisma.toLowerCase() as ReminderCategoryApiValue;
  return v;
}

export function toPrismaReminderCategory(api: string): string {
  return api.toUpperCase();
}

// Reminder action mappings (public API: done | snooze | skip | start_now)
export const ReminderActionApi = {
  DONE: 'done',
  SNOOZE: 'snooze',
  SKIP: 'skip',
  START_NOW: 'start_now',
} as const;

export type ReminderActionApiValue = (typeof ReminderActionApi)[keyof typeof ReminderActionApi];

// Priority level mappings
export const PriorityLevelApi = {
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type PriorityLevelApiValue = (typeof PriorityLevelApi)[keyof typeof PriorityLevelApi];

export function toApiPriorityLevel(prisma: string): PriorityLevelApiValue {
  return prisma.toLowerCase() as PriorityLevelApiValue;
}

export function toPrismaPriorityLevel(api: string): string {
  return api.toUpperCase();
}

// Reminder type mappings
export const ReminderTypeApi = {
  SIMPLE: 'simple',
  GUIDED: 'guided',
  GAME_SESSION: 'game_session',
} as const;

export type ReminderTypeApiValue = (typeof ReminderTypeApi)[keyof typeof ReminderTypeApi];

export function toApiReminderType(prisma: string): ReminderTypeApiValue {
  return prisma.toLowerCase() as ReminderTypeApiValue;
}

export function toPrismaReminderType(api: string): string {
  return api.toUpperCase();
}

// Internal event type mapping from public action to Prisma enum
// Redesigned: includes new guided reminder and escalation events
export function actionToEventType(action: ReminderActionApiValue | string): string {
  const map: Record<string, string> = {
    done: 'DONE',
    snooze: 'SNOOZED',
    skip: 'SKIPPED',
    start_now: 'START_NOW',
  };
  return map[action] || action.toUpperCase();
}
