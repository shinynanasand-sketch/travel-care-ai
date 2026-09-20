import { USER_PROFILE_STORAGE_KEY } from '@/lib/profile/localProfile';
import { useHealthStore } from '@/store/healthStore';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useUserProfileStore } from '@/store/userProfileStore';

/** 브라우저에 남은 데모 프로필·건강·코스·보호자 데이터를 모두 초기화 */
export function resetLocalData(): void {
  useUserProfileStore.getState().reset();
  void useUserProfileStore.persist.clearStorage();

  useHealthStore.getState().clearRecords();
  void useHealthStore.persist.clearStorage();

  useTravelPlanStore.getState().clear();
  void useTravelPlanStore.persist.clearStorage();

  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  localStorage.removeItem('guardians');
}
