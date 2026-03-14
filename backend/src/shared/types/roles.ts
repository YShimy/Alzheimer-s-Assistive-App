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

// Reminder action mappings (public API: done | snooze | skip)
export const ReminderActionApi = {
  DONE: 'done',
  SNOOZE: 'snooze',
  SKIP: 'skip',
} as const;

export type ReminderActionApiValue = (typeof ReminderActionApi)[keyof typeof ReminderActionApi];

// Internal event type mapping from public action to Prisma enum
export function actionToEventType(action: ReminderActionApiValue): string {
  const map: Record<ReminderActionApiValue, string> = {
    done: 'DONE',
    snooze: 'SNOOZED',
    skip: 'SKIPPED',
  };
  return map[action];
}
