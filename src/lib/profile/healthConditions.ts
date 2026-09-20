import type { ConditionType } from '@/types/health.types';

/** 만성질환·식이유형 등 건강/식이 조건이 하나라도 선택된 사용자 */
export function hasHealthOrDietConditions(
  conditions: ConditionType[] | undefined | null
): boolean {
  return (conditions?.length ?? 0) > 0;
}

export type CourseProfileMode = 'health' | 'general';

export function getCourseProfileMode(
  conditions: ConditionType[] | undefined | null
): CourseProfileMode {
  return hasHealthOrDietConditions(conditions) ? 'health' : 'general';
}

/** 비건·채식 — TourAPI 비건/채식 키워드 검색·우선 배치 */
export function wantsPlantBasedDining(
  conditions: ConditionType[] | undefined | null
): boolean {
  if (!conditions?.length) return false;
  return conditions.includes('VEGAN') || conditions.includes('VEGETARIAN');
}

export function wantsHalalDining(
  conditions: ConditionType[] | undefined | null
): boolean {
  return Boolean(conditions?.includes('HALAL'));
}

export function hasFoodAllergy(
  conditions: ConditionType[] | undefined | null
): boolean {
  return Boolean(conditions?.includes('FOOD_ALLERGY'));
}

export function hasHypertension(
  conditions: ConditionType[] | undefined | null
): boolean {
  return Boolean(conditions?.includes('HYPERTENSION'));
}

export function hasDiabetes(
  conditions: ConditionType[] | undefined | null
): boolean {
  if (!conditions?.length) return false;
  return (
    conditions.includes('DIABETES_TYPE1') ||
    conditions.includes('DIABETES_TYPE2')
  );
}
