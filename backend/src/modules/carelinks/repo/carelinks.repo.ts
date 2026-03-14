import { prisma } from '../../../shared/db/prisma.js';
import crypto from 'node:crypto';

type CareLink = any;

const CARELINK_INCLUDE = {
  caregiver: { select: { id: true, displayName: true, email: true } },
  patient: { select: { id: true, displayName: true, email: true } },
};

export const carelinksRepo = {
  async create(data: {
    caregiverUserId: string;
    invitedByUserId: string;
  }): Promise<CareLink> {
    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();

    return prisma.careLink.create({
      data: {
        caregiverUserId: data.caregiverUserId,
        invitedByUserId: data.invitedByUserId,
        inviteCode,
        status: 'PENDING',
      },
      include: CARELINK_INCLUDE,
    });
  },

  async findByInviteCode(inviteCode: string): Promise<CareLink | null> {
    return prisma.careLink.findUnique({
      where: { inviteCode },
      include: CARELINK_INCLUDE,
    });
  },

  async findById(id: string): Promise<CareLink | null> {
    return prisma.careLink.findUnique({
      where: { id },
      include: CARELINK_INCLUDE,
    });
  },

  async findByUserId(userId: string): Promise<CareLink[]> {
    return prisma.careLink.findMany({
      where: {
        OR: [
          { caregiverUserId: userId },
          { patientUserId: userId },
        ],
      },
      include: CARELINK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findActiveLink(caregiverUserId: string, patientUserId: string): Promise<CareLink | null> {
    return prisma.careLink.findFirst({
      where: {
        caregiverUserId,
        patientUserId,
        status: 'ACTIVE',
      },
    });
  },

  async acceptInvite(id: string, patientUserId: string): Promise<CareLink> {
    return prisma.careLink.update({
      where: { id },
      data: {
        patientUserId,
        status: 'ACTIVE',
        acceptedAt: new Date(),
      },
      include: CARELINK_INCLUDE,
    });
  },

  async updatePermissions(id: string, permissions: Record<string, boolean>): Promise<CareLink> {
    return prisma.careLink.update({
      where: { id },
      data: { permissions },
      include: CARELINK_INCLUDE,
    });
  },

  async revoke(id: string): Promise<CareLink> {
    return prisma.careLink.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
      },
      include: CARELINK_INCLUDE,
    });
  },
};
