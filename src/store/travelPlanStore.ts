import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenerateCourseResponse } from '@/types/course.types';

interface TravelPlanState {
  course: GenerateCourseResponse | null;
  destination: { areaCode: string; name: string } | null;
  period: { startDate: string; endDate: string; days: number } | null;
  veganFilter: boolean;
  setCourse: (course: GenerateCourseResponse) => void;
  setDestination: (dest: { areaCode: string; name: string }) => void;
  setPeriod: (period: { startDate: string; endDate: string; days: number }) => void;
  setVeganFilter: (enabled: boolean) => void;
  clear: () => void;
}

export const useTravelPlanStore = create<TravelPlanState>()(
  persist(
    (set) => ({
      course: null,
      destination: null,
      period: null,
      veganFilter: false,
      setCourse: (course) => set({ course }),
      setDestination: (destination) => set({ destination }),
      setPeriod: (period) => set({ period }),
      setVeganFilter: (veganFilter) => set({ veganFilter }),
      clear: () => set({ course: null, destination: null, period: null }),
    }),
    { name: 'travel-care-plan' }
  )
);
