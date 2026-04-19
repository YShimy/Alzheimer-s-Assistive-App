import { z } from 'zod';

export const importContactsSchema = z.object({
  contacts: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      phoneNumbers: z.array(z.string()).optional(),
      emails: z.array(z.string()).optional()
    })
  )
});

export const updateMemoSchema = z.object({
  relationLabel: z.string().nullable().optional(),
  shortMemo: z.string().nullable().optional(),
  photoAssetId: z.string().nullable().optional(),
  patientFavorite: z.boolean().optional(),
  caregiverFavorite: z.boolean().optional(),
  patientPriorityRank: z.number().nullable().optional(),
  caregiverPriorityRank: z.number().nullable().optional(),
});
