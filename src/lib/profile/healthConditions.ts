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
