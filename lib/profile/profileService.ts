import { endpoints } from '../api/endpoints';
import type { UserProfile } from '../api/types';

export const profileService = {
  async getMe(): Promise<UserProfile> {
    return endpoints.users.me();
  },
  async updateMe(payload: { fullName?: string | null }): Promise<UserProfile> {
    return endpoints.users.updateMe(payload);
  },
};
