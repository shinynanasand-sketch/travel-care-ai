export type ConditionType =
  | 'DIABETES_TYPE1'
  | 'DIABETES_TYPE2'
  | 'HYPERTENSION'
  | 'HEART_DISEASE'
  | 'VEGAN'
  | 'VEGETARIAN'
  | 'PESCATARIAN'
  | 'HALAL'
  | 'FOOD_ALLERGY';

export type VeganLevel =
  | 'FULL_VEGAN'
  | 'PARTIAL_VEGAN'
  | 'CHECK_NEEDED'
  | 'NOT_VEGAN';

export type SafetyLevel = 'GREEN' | 'YELLOW' | 'RED';

export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type BloodSugarAlertLevel =
  | 'NORMAL'
  | 'CAUTION'
  | 'WARNING'
  | 'DANGER'
  | 'EMERGENCY';

export interface HealthProfileInput {
  conditions: ConditionType[];
  medications: string[];
  activityLevel: ActivityLevel;
  insulinUser: boolean;
  restrictions: string[];
  targetBSMin?: number;
  targetBSMax?: number;
}

export interface BloodSugarAssessment {
  level: BloodSugarAlertLevel;
  action: string | null;
}
