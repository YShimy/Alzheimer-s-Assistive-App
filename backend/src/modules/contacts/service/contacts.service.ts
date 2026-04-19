import { AppError } from '../../../shared/errors/AppError.js';
import { prisma } from '../../../shared/db/prisma.js';

export const contactsService = {
  async getConsent(patientUserId: string) {
    let consent = await prisma.contactSupportConsent.findUnique({
      where: { patientUserId }
    });
    if (!consent) {
      consent = await prisma.contactSupportConsent.create({
        data: { patientUserId, status: 'PENDING' }
      });
    }
    return consent;
  },

  async grantConsent(patientUserId: string, source: string = 'device_prompt') {
    return prisma.contactSupportConsent.upsert({
      where: { patientUserId },
      update: { status: 'GRANTED', grantedAt: new Date(), source },
      create: { patientUserId, status: 'GRANTED', grantedAt: new Date(), source }
    });
  },

  async revokeConsent(patientUserId: string) {
    return prisma.contactSupportConsent.update({
      where: { patientUserId },
      data: { status: 'REVOKED', revokedAt: new Date() }
    });
  },

  async importSelectedContacts(patientUserId: string, contacts: any[]) {
    const consent = await this.getConsent(patientUserId);
    if (consent.status !== 'GRANTED') {
      throw new AppError('Patient has not granted consent to sync contacts.', 403);
    }

    const imported = [];
    for (const c of contacts) {
      let patientContact = undefined;
      if (c.id) {
        patientContact = await prisma.patientContact.findFirst({
          where: { patientUserId, sourceContactId: c.id }
        });
      }
      
      if (patientContact) {
         patientContact = await prisma.patientContact.update({
           where: { id: patientContact.id },
           data: {
             displayName: c.name,
             normalizedPhones: c.phoneNumbers ?? [],
             normalizedEmails: c.emails ?? [],
             lastSyncedAt: new Date()
           }
         });
      } else {
         patientContact = await prisma.patientContact.create({
           data: {
             patientUserId,
             sourceContactId: c.id,
             displayName: c.name,
             normalizedPhones: c.phoneNumbers ?? [],
             normalizedEmails: c.emails ?? [],
           }
         });
      }
      
      const memo = await prisma.contactMemo.findFirst({
        where: { patientContactId: patientContact.id }
      });
      if (!memo) {
        await prisma.contactMemo.create({
          data: {
             patientContactId: patientContact.id,
             patientUserId,
             createdByUserId: patientUserId
          }
        });
      }
      imported.push(patientContact);
    }
    return { count: imported.length };
  },

  async listContacts(patientUserId: string) {
    const contacts = await prisma.patientContact.findMany({
      where: { patientUserId, isArchived: false },
      include: {
        memos: {
          include: {
             photoAsset: true
          }
        }
      }
    });

    return contacts.map(c => {
      const memo = c.memos[0];
      let score = 0;
      if (memo) {
        if (memo.patientFavorite && memo.caregiverFavorite) score = 100;
        else if (memo.patientFavorite) score = 50;
        else if (memo.caregiverFavorite) score = 40;
        else if (memo.patientPriorityRank) score = 30;
      }
      const { memos, ...rest } = c;
      return { ...rest, memo, _sortScore: score };
    }).sort((a, b) => {
       if (b._sortScore !== a._sortScore) {
          return b._sortScore - a._sortScore;
       }
       return a.displayName.localeCompare(b.displayName);
    });
  },

  async updateMemo(patientUserId: string, contactId: string, editorId: string, role: string, data: any) {
    const contact = await prisma.patientContact.findFirst({
      where: { id: contactId, patientUserId }
    });
    if (!contact) throw new AppError('Contact not found', 404);

    let memo = await prisma.contactMemo.findFirst({
      where: { patientContactId: contact.id }
    });

    if (!memo) {
      memo = await prisma.contactMemo.create({
        data: {
          patientContactId: contact.id,
          patientUserId,
          createdByUserId: editorId
        }
      });
    }

    const updates: any = {};
    if (data.relationLabel !== undefined) updates.relationLabel = data.relationLabel;
    if (data.shortMemo !== undefined) updates.shortMemo = data.shortMemo;
    if (data.photoAssetId !== undefined) updates.photoAssetId = data.photoAssetId;
    
    if (role === 'patient') {
       if (data.patientFavorite !== undefined) updates.patientFavorite = data.patientFavorite;
       if (data.patientPriorityRank !== undefined) updates.patientPriorityRank = data.patientPriorityRank;
    } else {
       if (data.caregiverFavorite !== undefined) updates.caregiverFavorite = data.caregiverFavorite;
       if (data.caregiverPriorityRank !== undefined) updates.caregiverPriorityRank = data.caregiverPriorityRank;
    }

    return prisma.contactMemo.update({
      where: { id: memo.id },
      data: updates,
      include: { photoAsset: true }
    });
  }
};
