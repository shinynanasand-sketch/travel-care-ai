import type { VeganLevel } from './health.types';

export interface TourApiItem {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  dist?: string;
  firstimage?: string;
  tel?: string;
  cat3?: string;
  veganScore?: number;
  veganLevel?: VeganLevel;
}

export interface RestaurantDetail {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  firstmenu?: string;
  treatmenu?: string;
  opentimefood?: string;
  restdatefood?: string;
  tel?: string;
}

export interface AttractionItem extends TourApiItem {
  contentTypeId?: string;
}

export type AccessibilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AccessibilityInfo {
  contentid: string;
  wheelchair?: string;
  elevator?: string;
  restroom?: string;
  route?: string;
  parking?: string;
  exit?: string;
  publictransport?: string;
  stroller?: string;
  braileblock?: string;
  audioguide?: string;
  level?: AccessibilityLevel;
}

export interface WeatherInfo {
  areaCode: string;
  date: string;
  temperature: number;
  humidity: number;
  description: string;
}

export interface BarrierFreeItem {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  dist?: string;
  firstimage?: string;
  tel?: string;
}

export type WellnessTheme =
  | 'SPA'
  | 'HEALING'
  | 'NATURE'
  | 'HANSIK'
  | 'FOOD'
  | 'STAY';

export interface WellnessItem {
  contentid: string;
  title: string;
  addr1: string;
  mapx: string;
  mapy: string;
  dist?: string;
  firstimage?: string;
  tel?: string;
  cat3?: string;
  theme?: WellnessTheme;
}
