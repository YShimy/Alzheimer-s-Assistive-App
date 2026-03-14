// ─── Shared enums (mirrors backend enums) ───

export enum UserRole {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
}

export enum CareLinkStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
}

export enum ReminderCategory {
  MEDICATION = 'MEDICATION',
  MEAL = 'MEAL',
  EXERCISE = 'EXERCISE',
  HYGIENE = 'HYGIENE',
  APPOINTMENT = 'APPOINTMENT',
  SOCIAL = 'SOCIAL',
  OTHER = 'OTHER',
}

export enum ReminderAction {
  DONE = 'DONE',
  SNOOZED = 'SNOOZED',
  DISMISSED = 'DISMISSED',
}

export enum ChecklistRunStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}
