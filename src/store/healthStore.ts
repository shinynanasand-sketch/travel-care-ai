import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HealthRecordEntry {
  id: string;
  recordType: 'BLOOD_SUGAR' | 'BLOOD_PRESSURE';
  value: number;
  value2?: number;
  alertLevel: string;
  recordedAt: string;
}

interface HealthState {
  records: HealthRecordEntry[];
  latestBloodSugar: number | null;
  addRecord: (record: Omit<HealthRecordEntry, 'id'>) => void;
  setLatestBloodSugar: (value: number) => void;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      records: [],
      latestBloodSugar: null,
      addRecord: (record) =>
        set((state) => ({
          records: [
            { ...record, id: crypto.randomUUID() },
            ...state.records,
          ].slice(0, 50),
        })),
      setLatestBloodSugar: (value) => set({ latestBloodSugar: value }),
    }),
    { name: 'travel-care-health' }
  )
);
