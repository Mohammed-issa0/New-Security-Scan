import { endpoints } from '../api/endpoints';
import type { DeleteAccountResponse, UserProfile } from '../api/types';

/** The backend requires this exact literal as the typed confirmation. */
export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE';

export const profileService = {
  async getMe(): Promise<UserProfile> {
    return endpoints.users.me();
  },
  async updateMe(payload: { fullName?: string | null }): Promise<UserProfile> {
    return endpoints.users.updateMe(payload);
  },
  /** Permanent GDPR erasure — the session is dead as soon as this resolves. */
  async deleteAccount(password: string): Promise<DeleteAccountResponse> {
    return endpoints.account.delete({
      password,
      confirmation: DELETE_ACCOUNT_CONFIRMATION,
    });
  },
};
