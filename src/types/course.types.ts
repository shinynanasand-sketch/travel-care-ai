import type { ConditionType, SafetyLevel, VeganLevel } from './health.types';
import type { MedicalFacility, MedicalLookupMeta } from './medical.types';
import type { HealthProfileInput } from './health.types';
import type { AccessibilityInfo, WellnessTheme } from './tourapi.types';

export interface MenuItemAnalysis {
  name: string;
  sodiumRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  sugarRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  diabetesFriendly: boolean;
  veganOk: boolean;
}

export interface MenuAnalysis {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  veganFriendly: boolean | 'PARTIAL';
  veganItems: string[];
  nonVeganIngredients: string[];
  menuItems: MenuItemAnalysis[];
  recommendation: string;
  alternatives: string[];
  postMealAdvice: string;
}

export interface Schedule {
  time: string;
  type: 'RESTAURANT' | 'ATTRACTION' | 'REST' | 'MEDICAL' | 'WELLNESS';
  contentId: string;
  title: string;
  address: string;
  coordinates: { lat: number; lng: number };
  safetyLevel: SafetyLevel;
  veganLevel?: VeganLevel;
  /** Travel-facing one-liner (shown before care copy). */
  hookLine?: string;
  safetyReason: string;
  healthTips: string[];
  menuAnalysis?: MenuAnalysis;
  nearbyMedical: MedicalFacility[];
  accessibility?: AccessibilityInfo;
  wellnessTheme?: WellnessTheme;
  /** TourAPI firstimage / firstimage2 */
  imageUrl?: string;
}

export type CoursePlaceKind = 'ATTRACTION' | 'RESTAURANT' | 'WELLNESS';

export interface CourseAlternativePlace {
  contentId: string;
  title: string;
  address: string;
  imageUrl: string;
  kind: CoursePlaceKind;
}

export interface DayCourse {
  day: number;
  date: string;
  /** Day trip theme label for UI */
  themeLabel?: string;
  schedules: Schedule[];
}

export interface HealthWarning {
  level: 'INFO' | 'WARNING' | 'DANGER';
  message: string;
}

export type TravelStyle =
  | '힐링'
  | '액티비티'
  | '문화·역사'
  | '자연·전망'
  | '맛집·카페'
  | '시티·산책';

export const TRAVEL_STYLES: TravelStyle[] = [
  '힐링',
  '액티비티',
  '문화·역사',
  '자연·전망',
  '맛집·카페',
  '시티·산책',
];

export interface GenerateCourseRequest {
  userId: string;
  destination: {
    areaCode: string;
    name: string;
    /** TourAPI sigunguCode — 시·군·구 */
    sigunguCode?: string;
  };
  period: { startDate: string; endDate: string; days: number };
  healthProfile: HealthProfileInput;
  /** 사용자 여행 취향 (코스·명소 선정에 반영) */
  travelStyle?: TravelStyle;
}

export interface GenerateCourseResponse {
  courseId: string;
  days: DayCourse[];
  medicalFacilities: MedicalFacility[];
  /** Present when hospital/pharmacy lookup used HIRA/Kakao/mock. */
  medicalMeta?: MedicalLookupMeta;
  overallSafetyScore: number;
  hasVeganOptions: boolean;
  warnings: HealthWarning[];
  /** 메인 코스에 포함되지 않은 대안 장소 (사진 있는 항목) */
  alternatives?: CourseAlternativePlace[];
}

export interface AdjustCourseRequest {
  courseId: string;
  userId: string;
  bloodSugar?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  currentLocation?: { lat: number; lng: number };
  conditions: ConditionType[];
}

export interface AdjustCourseResponse {
  adjusted: boolean;
  alertLevel: string;
  action: string | null;
  updatedSchedules?: Schedule[];
  nearbyFacilities?: MedicalFacility[];
  guardianNotified: boolean;
}
