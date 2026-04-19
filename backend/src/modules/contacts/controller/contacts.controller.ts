import type { Request, Response } from 'express';
import { contactsService } from '../service/contacts.service.js';

export const contactsController = {
  async getConsent(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const consent = await contactsService.getConsent(patientId);
    res.json({ consent });
  },

  async grantConsent(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const { source } = req.body;
    const consent = await contactsService.grantConsent(patientId, source);
    res.json({ consent });
  },

  async revokeConsent(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const consent = await contactsService.revokeConsent(patientId);
    res.json({ consent });
  },

  async importSelectedContacts(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const { contacts } = req.body;
    const result = await contactsService.importSelectedContacts(patientId, contacts);
    res.json(result);
  },

  async listContacts(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const userId = req.user?.userId;
    const role = req.user?.role;
    console.log(`[Contacts] listContacts - patientId: ${patientId}, userId: ${userId}, role: ${role}`);
    const contacts = await contactsService.listContacts(patientId);
    console.log(`[Contacts] listContacts - returning ${contacts.length} contacts`);
    res.json({ contacts });
  },

  async updateMemo(req: Request, res: Response) {
    const patientId = req.params.patientId as string;
    const contactId = req.params.contactId as string;
    const editorId = req.user!.userId;
    const role = req.user!.role.toLowerCase();
    
    console.log(`[Contacts] updateMemo - patientId: ${patientId}, contactId: ${contactId}, editorId: ${editorId}, role: ${role}`);
    console.log(`[Contacts] updateMemo - body:`, JSON.stringify(req.body));
    
    const updated = await contactsService.updateMemo(patientId, contactId, editorId, role, req.body);
    console.log(`[Contacts] updateMemo - SUCCESS:`, JSON.stringify(updated));
    res.json({ memo: updated });
  }
};
