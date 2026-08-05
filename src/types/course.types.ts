import type { ConditionType, SafetyLevel, VeganLevel } from './health.types';
import type { MedicalFacility } from './medical.types';
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
  safetyReason: string;
  healthTips: string[];
  menuAnalysis?: MenuAnalysis;
  nearbyMedical: MedicalFacility[];
  accessibility?: AccessibilityInfo;
  wellnessTheme?: WellnessTheme;
}

export interface DayCourse {
  day: number;
  date: string;
  schedules: Schedule[];
}

export interface HealthWarning {
  level: 'INFO' | 'WARNING' | 'DANGER';
  message: string;
}

export interface GenerateCourseRequest {
  userId: string;
  destination: { areaCode: string; name: string };
  period: { startDate: string; endDate: string; days: number };
  healthProfile: HealthProfileInput;
}

export interface GenerateCourseResponse {
  courseId: string;
  days: DayCourse[];
  medicalFacilities: MedicalFacility[];
  overallSafetyScore: number;
  hasVeganOptions: boolean;
  warnings: HealthWarning[];
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
