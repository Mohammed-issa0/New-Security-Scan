import { endpoints } from '../api/endpoints';
import type { ContactRequest, ContactResponse } from '../api/types';

export const contactService = {
  /** Public endpoint — the JWT is attached automatically when the visitor is signed in. */
  async send(payload: ContactRequest): Promise<ContactResponse> {
    return endpoints.contact.send({
      name: payload.name.trim(),
      email: payload.email.trim(),
      subject: payload.subject.trim(),
      message: payload.message.trim(),
    });
  },
};
