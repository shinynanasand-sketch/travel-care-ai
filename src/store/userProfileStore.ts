import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConditionType, HealthProfileInput } from '@/types/health.types';

interface UserProfileState {
  userId: string;
  name: string;
  healthProfile: HealthProfileInput | null;
  setUserId: (id: string) => void;
  setName: (name: string) => void;
  setHealthProfile: (profile: HealthProfileInput) => void;
  hasCondition: (condition: ConditionType) => boolean;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      userId: 'demo-user',
      name: '여행자',
      healthProfile: null,
      setUserId: (id) => set({ userId: id }),
      setName: (name) => set({ name }),
      setHealthProfile: (profile) => set({ healthProfile: profile }),
      hasCondition: (condition) =>
        get().healthProfile?.conditions.includes(condition) ?? false,
    }),
    { name: 'travel-care-profile' }
  )
);
