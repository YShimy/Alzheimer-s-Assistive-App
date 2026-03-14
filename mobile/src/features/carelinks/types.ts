/** CareLinks feature types */
export interface CareLinkPermissions {
  canCreateReminders: boolean;
  canEditReminders: boolean;
  canViewProgress: boolean;
  canCreateChecklists: boolean;
  canEditChecklists: boolean;
  canMarkTasksOnBehalf: boolean;
}

export interface CareLink {
  id: string;
  caregiverUserId: string;
  patientUserId: string | null;
  status: string;
  permissions: CareLinkPermissions;
  inviteCode: string;
  invitedByUserId: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  caregiver?: { id: string; displayName: string; email: string };
  patient?: { id: string; displayName: string; email: string } | null;
}
