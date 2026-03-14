/** CareLinks module types */

export interface CareLinkPermissions {
  canCreateReminders: boolean;
  canEditReminders: boolean;
  canViewProgress: boolean;
  canCreateChecklists: boolean;
  canEditChecklists: boolean;
  canMarkTasksOnBehalf: boolean;
}

export interface CareLinkResponse {
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
  // Populated user info for display
  caregiver?: { id: string; displayName: string; email: string };
  patient?: { id: string; displayName: string; email: string } | null;
}

export interface InviteInput {
  patientEmail?: string;
}

export interface AcceptInput {
  inviteCode: string;
}

export interface UpdatePermissionsInput {
  permissions: Partial<CareLinkPermissions>;
}
