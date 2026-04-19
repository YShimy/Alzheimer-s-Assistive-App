import { apiClient } from '../../infrastructure/api/client';
import type { 
  ContactSupportConsent, 
  PatientContact, 
  ContactMemo, 
  ImportContactInput 
} from './types';

export const contactsApi = {
  async getConsent(patientId: string): Promise<{ consent: ContactSupportConsent }> {
    return apiClient.get(`/patients/${patientId}/contact-support/consent`);
  },

  async grantConsent(patientId: string, source: string = 'device_prompt'): Promise<{ consent: ContactSupportConsent }> {
    return apiClient.post(`/patients/${patientId}/contact-support/consent/grant`, { source });
  },

  async revokeConsent(patientId: string): Promise<{ consent: ContactSupportConsent }> {
    return apiClient.post(`/patients/${patientId}/contact-support/consent/revoke`, {});
  },

  async listContacts(patientId: string): Promise<{ contacts: PatientContact[] }> {
    return apiClient.get(`/patients/${patientId}/contacts`);
  },

  async importSelected(patientId: string, contacts: ImportContactInput[]): Promise<{ count: number }> {
    return apiClient.post(`/patients/${patientId}/contacts/import-selected`, { contacts });
  },

  async updateMemo(
    patientId: string, 
    contactId: string, 
    data: Partial<ContactMemo>
  ): Promise<{ memo: ContactMemo }> {
    return apiClient.patch(`/patients/${patientId}/contacts/${contactId}`, data);
  }
};
