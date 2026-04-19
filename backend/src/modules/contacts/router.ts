import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { careLinkGuard } from '../../shared/middleware/careLinkGuard.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { contactsController } from './controller/contacts.controller.js';

export const contactsRouter = Router({ mergeParams: true });

contactsRouter.use(authMiddleware);

// Consent endpoints - patient only (they control their own consent)
contactsRouter.get('/contact-support/consent', asyncHandler(contactsController.getConsent));
contactsRouter.post('/contact-support/consent/grant', asyncHandler(contactsController.grantConsent));
contactsRouter.post('/contact-support/consent/revoke', asyncHandler(contactsController.revokeConsent));

// Contacts listing and management - patients own their data, caregivers need canViewProgress
contactsRouter.get('/contacts', careLinkGuard('canViewProgress'), asyncHandler(contactsController.listContacts));
contactsRouter.post('/contacts/import-selected', careLinkGuard('canViewProgress'), asyncHandler(contactsController.importSelectedContacts));
contactsRouter.patch('/contacts/:contactId', careLinkGuard('canViewProgress'), asyncHandler(contactsController.updateMemo));
