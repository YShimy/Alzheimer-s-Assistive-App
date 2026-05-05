import { prisma } from '../../../shared/db/prisma.js';
import { AppError } from '../../../shared/errors/AppError.js';

// Default visibility: which fields patients can see
const PATIENT_VISIBLE_DEFAULTS: Record<string, 'PATIENT_VISIBLE' | 'CAREGIVER_ONLY'> = {
  preferredName: 'PATIENT_VISIBLE',
  primaryLanguage: 'PATIENT_VISIBLE',
  livingSituation: 'PATIENT_VISIBLE',
  primaryCaregiverName: 'PATIENT_VISIBLE',
  primaryCaregiverPhone: 'PATIENT_VISIBLE',
  emergencyContactName: 'PATIENT_VISIBLE',
  emergencyContactPhone: 'PATIENT_VISIBLE',
  communicationTips: 'PATIENT_VISIBLE',
  calmingStrategies: 'PATIENT_VISIBLE',
  memorySupportTips: 'PATIENT_VISIBLE',
  preferredActivities: 'PATIENT_VISIBLE',
  emergencyInstructions: 'PATIENT_VISIBLE',
  // Caregiver-only by default
  dateOfBirth: 'CAREGIVER_ONLY',
  addressNote: 'CAREGIVER_ONLY',
  allergies: 'CAREGIVER_ONLY',
  currentMedicationSummary: 'CAREGIVER_ONLY',
  importantConditionsNote: 'CAREGIVER_ONLY',
  mobilitySupportNote: 'CAREGIVER_ONLY',
  dietaryNotes: 'CAREGIVER_ONLY',
  doctorName: 'CAREGIVER_ONLY',
  doctorPhone: 'CAREGIVER_ONLY',
  clinicOrHospitalName: 'CAREGIVER_ONLY',
  morningRoutineNotes: 'CAREGIVER_ONLY',
  eveningRoutineNotes: 'CAREGIVER_ONLY',
  mealSupportNotes: 'CAREGIVER_ONLY',
  sleepRoutineNotes: 'CAREGIVER_ONLY',
  hydrationNotes: 'CAREGIVER_ONLY',
  distressTriggers: 'CAREGIVER_ONLY',
  homeSafetyNotes: 'CAREGIVER_ONLY',
  wanderingRiskNotes: 'CAREGIVER_ONLY',
  generalNotes: 'CAREGIVER_ONLY',
};

export type ImportantInfoUpdateInput = {
  preferredName?: string;
  dateOfBirth?: string; // ISO string
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
};

function resolveVisibility(stored: unknown): Record<string, string> {
  const override = (stored && typeof stored === 'object' ? stored : {}) as Record<string, string>;
  return { ...PATIENT_VISIBLE_DEFAULTS, ...override };
}

export const importantInfoService = {
  async getForCaregiver(patientId: string) {
    const info = await prisma.patientImportantInfo.findUnique({
      where: { patientId },
    });
    return info ?? null;
  },

  async getForPatient(patientId: string) {
    const info = await prisma.patientImportantInfo.findUnique({
      where: { patientId },
    });
    if (!info) return null;

    const visibility = resolveVisibility(info.visibilityConfig);

    // Strip caregiver-only fields
    const safeData: Record<string, unknown> = {
      id: info.id,
      patientId: info.patientId,
      lastReviewedAt: info.lastReviewedAt,
      updatedAt: info.updatedAt,
    };

    const textFields = [
      'preferredName', 'primaryLanguage', 'livingSituation',
      'primaryCaregiverName', 'primaryCaregiverPhone',
      'emergencyContactName', 'emergencyContactPhone',
      'communicationTips', 'calmingStrategies', 'memorySupportTips',
      'preferredActivities', 'emergencyInstructions',
      'doctorName', 'dateOfBirth', 'addressNote', 'allergies',
      'currentMedicationSummary', 'importantConditionsNote', 'mobilitySupportNote',
      'dietaryNotes', 'morningRoutineNotes', 'eveningRoutineNotes',
      'mealSupportNotes', 'sleepRoutineNotes', 'hydrationNotes',
      'distressTriggers', 'homeSafetyNotes', 'wanderingRiskNotes',
      'generalNotes', 'doctorPhone', 'clinicOrHospitalName',
    ];

    for (const field of textFields) {
      const vis = visibility[field] ?? 'CAREGIVER_ONLY';
      if (vis === 'PATIENT_VISIBLE') {
        safeData[field] = (info as Record<string, unknown>)[field] ?? null;
      }
    }

    return safeData;
  },

  async upsert(patientId: string, caregiverId: string, input: ImportantInfoUpdateInput) {
    const data: Record<string, unknown> = {
      updatedByUserId: caregiverId,
    };

    // Map all defined string fields
    const stringFields = [
      'preferredName', 'primaryLanguage', 'addressNote', 'livingSituation',
      'primaryCaregiverName', 'primaryCaregiverPhone',
      'emergencyContactName', 'emergencyContactPhone',
      'doctorName', 'doctorPhone', 'clinicOrHospitalName',
      'allergies', 'currentMedicationSummary', 'importantConditionsNote',
      'mobilitySupportNote', 'dietaryNotes',
      'morningRoutineNotes', 'eveningRoutineNotes', 'mealSupportNotes',
      'sleepRoutineNotes', 'hydrationNotes',
      'communicationTips', 'calmingStrategies', 'memorySupportTips',
      'preferredActivities', 'distressTriggers',
      'homeSafetyNotes', 'wanderingRiskNotes', 'emergencyInstructions',
      'generalNotes',
    ] as const;

    for (const f of stringFields) {
      if (input[f] !== undefined) data[f] = input[f];
    }

    if (input.dateOfBirth !== undefined) {
      data.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    }

    if (input.visibilityConfig !== undefined) {
      data.visibilityConfig = input.visibilityConfig;
    }

    const info = await prisma.patientImportantInfo.upsert({
      where: { patientId },
      create: { patientId, ...data },
      update: data,
    });

    // Log analytics event (fire-and-forget)
    prisma.analyticsEvent.create({
      data: {
        eventName: 'important_info_updated',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: { infoId: info.id },
      },
    }).catch(e => console.error('Failed to log important_info_updated', e));

    return info;
  },

  async markReviewed(patientId: string, caregiverId: string) {
    const existing = await prisma.patientImportantInfo.findUnique({ where: { patientId } });
    if (!existing) {
      throw AppError.notFound('Important information card not found for this patient');
    }

    const updated = await prisma.patientImportantInfo.update({
      where: { patientId },
      data: { lastReviewedAt: new Date() },
    });

    prisma.analyticsEvent.create({
      data: {
        eventName: 'important_info_reviewed',
        patientUserId: patientId,
        actorUserId: caregiverId,
        actorRole: 'caregiver',
        payload: { infoId: updated.id },
      },
    }).catch(e => console.error('Failed to log important_info_reviewed', e));

    return updated;
  },
};
