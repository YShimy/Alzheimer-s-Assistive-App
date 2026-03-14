import { AppError } from '../../../shared/errors/AppError.js';
import { ErrorCode } from '../../../shared/errors/errorCodes.js';
import { carelinksRepo } from '../repo/carelinks.repo.js';
import type { CareLinkPermissions, CareLinkResponse } from '../types/carelinks.types.js';

function toCareLink(link: any): CareLinkResponse {
  return {
    id: link.id,
    caregiverUserId: link.caregiverUserId,
    patientUserId: link.patientUserId,
    status: link.status.toLowerCase(),
    permissions: link.permissions as CareLinkPermissions,
    inviteCode: link.inviteCode,
    invitedByUserId: link.invitedByUserId,
    acceptedAt: link.acceptedAt?.toISOString() ?? null,
    revokedAt: link.revokedAt?.toISOString() ?? null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    caregiver: link.caregiver,
    patient: link.patient ?? null,
  };
}

export const carelinksService = {
  /**
   * Caregiver creates an invite code.
   */
  async createInvite(caregiverUserId: string): Promise<CareLinkResponse> {
    const link = await carelinksRepo.create({
      caregiverUserId,
      invitedByUserId: caregiverUserId,
    });

    return toCareLink(link);
  },

  /**
   * Patient accepts an invite code.
   */
  async acceptInvite(patientUserId: string, inviteCode: string): Promise<CareLinkResponse> {
    const link = await carelinksRepo.findByInviteCode(inviteCode);

    if (!link) {
      throw new AppError('Invalid invite code', 404, ErrorCode.CARELINK_INVALID_CODE);
    }

    if (link.status === 'ACTIVE') {
      throw new AppError('Invite already accepted', 400, ErrorCode.CARELINK_ALREADY_ACCEPTED);
    }

    if (link.status === 'REVOKED') {
      throw new AppError('Invite has been revoked', 400, ErrorCode.CARELINK_ALREADY_REVOKED);
    }

    if (link.caregiverUserId === patientUserId) {
      throw new AppError('Cannot link to yourself', 400, ErrorCode.CARELINK_SELF_LINK);
    }

    // Check if an active link already exists between these two users
    const existing = await carelinksRepo.findActiveLink(link.caregiverUserId, patientUserId);
    if (existing) {
      throw new AppError('An active care link already exists', 400, ErrorCode.CARELINK_ALREADY_EXISTS);
    }

    const updated = await carelinksRepo.acceptInvite(link.id, patientUserId);

    return toCareLink(updated);
  },

  /**
   * Get all care links for the current user.
   */
  async getMyLinks(userId: string): Promise<CareLinkResponse[]> {
    const links = await carelinksRepo.findByUserId(userId);
    return links.map(toCareLink);
  },

  /**
   * Update permissions on a care link.
   * Only the caregiver who owns the link can update permissions.
   */
  async updatePermissions(
    linkId: string,
    requestingUserId: string,
    permissions: Partial<CareLinkPermissions>,
  ): Promise<CareLinkResponse> {
    const link = await carelinksRepo.findById(linkId);

    if (!link) {
      throw new AppError('Care link not found', 404, ErrorCode.CARELINK_NOT_FOUND);
    }

    // Only the caregiver or the patient involved can update permissions
    if (link.caregiverUserId !== requestingUserId && link.patientUserId !== requestingUserId) {
      throw new AppError('Not authorized to modify this care link', 403, ErrorCode.CARELINK_PERMISSION_DENIED);
    }

    if (link.status !== 'ACTIVE') {
      throw new AppError('Can only update permissions on active care links', 400, ErrorCode.CARELINK_NOT_FOUND);
    }

    const currentPermissions = link.permissions as CareLinkPermissions;
    const merged = { ...currentPermissions, ...permissions };

    const updated = await carelinksRepo.updatePermissions(linkId, merged as any);

    return toCareLink(updated);
  },

  /**
   * Revoke a care link.
   * Either party (caregiver or patient) can revoke.
   */
  async revoke(linkId: string, requestingUserId: string): Promise<CareLinkResponse> {
    const link = await carelinksRepo.findById(linkId);

    if (!link) {
      throw new AppError('Care link not found', 404, ErrorCode.CARELINK_NOT_FOUND);
    }

    if (link.caregiverUserId !== requestingUserId && link.patientUserId !== requestingUserId) {
      throw new AppError('Not authorized to revoke this care link', 403, ErrorCode.CARELINK_PERMISSION_DENIED);
    }

    if (link.status === 'REVOKED') {
      throw new AppError('Care link already revoked', 400, ErrorCode.CARELINK_ALREADY_REVOKED);
    }

    const updated = await carelinksRepo.revoke(linkId);

    return toCareLink(updated);
  },
};
