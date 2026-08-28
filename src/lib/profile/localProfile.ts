import type { ConditionType } from '@/types/health.types';

/** localStorage 임시 프로필 (DB 미사용) */
export interface SimpleUserProfile {
  condition?: 'diabetes' | 'hypertension' | 'heart_disease';
  diet?: 'vegan' | 'vegetarian' | 'pescatarian' | 'halal' | 'food_allergy';
}

export const USER_PROFILE_STORAGE_KEY = 'userProfile';

const CONDITION_MAP: Partial<Record<ConditionType, SimpleUserProfile['condition']>> = {
  DIABETES_TYPE1: 'diabetes',
  DIABETES_TYPE2: 'diabetes',
  HYPERTENSION: 'hypertension',
  HEART_DISEASE: 'heart_disease',
};

const DIET_MAP: Partial<Record<ConditionType, SimpleUserProfile['diet']>> = {
  VEGAN: 'vegan',
  VEGETARIAN: 'vegetarian',
  PESCATARIAN: 'pescatarian',
  HALAL: 'halal',
  FOOD_ALLERGY: 'food_allergy',
};

export function toSimpleProfile(conditions: ConditionType[]): SimpleUserProfile {
  const profile: SimpleUserProfile = {};
  for (const c of conditions) {
    const condition = CONDITION_MAP[c];
    if (condition) profile.condition = condition;
    const diet = DIET_MAP[c];
    if (diet) profile.diet = diet;
  }
  return profile;
}

export function saveUserProfileToStorage(conditions: ConditionType[]): SimpleUserProfile {
  const profile = toSimpleProfile(conditions);
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export function loadUserProfileFromStorage(): SimpleUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SimpleUserProfile;
  } catch {
    return null;
  }
}
