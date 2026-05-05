import { apiClient } from '../../infrastructure/api/client';

export type ImportantInfoData = {
  id?: string;
  patientId?: string;
  preferredName?: string;
  dateOfBirth?: string;
  primaryLanguage?: string;
  addressNote?: string;
  livingSituation?: string;
  primaryCaregiverName?: string;
  primaryCaregiverPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  clinicOrHospitalName?: string;
  allergies?: string;
  currentMedicationSummary?: string;
  importantConditionsNote?: string;
  mobilitySupportNote?: string;
  dietaryNotes?: string;
  morningRoutineNotes?: string;
  eveningRoutineNotes?: string;
  mealSupportNotes?: string;
  sleepRoutineNotes?: string;
  hydrationNotes?: string;
  communicationTips?: string;
  calmingStrategies?: string;
  memorySupportTips?: string;
  preferredActivities?: string;
  distressTriggers?: string;
  homeSafetyNotes?: string;
  wanderingRiskNotes?: string;
  emergencyInstructions?: string;
  generalNotes?: string;
  visibilityConfig?: Record<string, 'PATIENT_VISIBLE' | 'CAREGIVER_ONLY'>;
  lastReviewedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

export const importantInfoApi = {
  // Caregiver — get full card
  async get(patientId: string): Promise<{ info: ImportantInfoData | null }> {
    return apiClient.get(`/patients/${patientId}/important-info`);
  },

  // Caregiver — upsert card
  async upsert(patientId: string, data: Partial<ImportantInfoData>): Promise<{ info: ImportantInfoData }> {
    return apiClient.patch(`/patients/${patientId}/important-info`, data);
  },

  // Caregiver — mark as reviewed
  async markReviewed(patientId: string): Promise<{ info: ImportantInfoData }> {
    return apiClient.post(`/patients/${patientId}/important-info/review`);
  },

  // Patient — get visible fields only
  async getMyInfo(): Promise<{ info: ImportantInfoData | null }> {
    return apiClient.get('/me/important-info');
  },
};
