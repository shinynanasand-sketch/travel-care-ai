import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  GenerateCourseRequest,
  GenerateCourseResponse,
} from '@/types/course.types';

export type PlanDestination = {
  areaCode: string;
  name: string;
  sigunguCode?: string;
};

interface TravelPlanState {
  course: GenerateCourseResponse | null;
  destination: PlanDestination | null;
  period: { startDate: string; endDate: string; days: number } | null;
  /** Last generate payload — for day regenerate / swap */
  lastRequest: GenerateCourseRequest | null;
  veganFilter: boolean;
  setCourse: (course: GenerateCourseResponse) => void;
  setDestination: (dest: PlanDestination) => void;
  setPeriod: (period: {
    startDate: string;
    endDate: string;
    days: number;
  }) => void;
  setLastRequest: (req: GenerateCourseRequest | null) => void;
  setVeganFilter: (v: boolean) => void;
  clear: () => void;
}

export const useTravelPlanStore = create<TravelPlanState>()(
  persist(
    (set) => ({
      course: null,
      destination: null,
      period: null,
      lastRequest: null,
      veganFilter: false,
      setCourse: (course) => set({ course }),
      setDestination: (destination) => set({ destination }),
      setPeriod: (period) => set({ period }),
      setLastRequest: (lastRequest) => set({ lastRequest }),
      setVeganFilter: (veganFilter) => set({ veganFilter }),
      clear: () =>
        set({
          course: null,
          destination: null,
          period: null,
          lastRequest: null,
          veganFilter: false,
        }),
    }),
    { name: 'travel-care-plan' }
  )
);
