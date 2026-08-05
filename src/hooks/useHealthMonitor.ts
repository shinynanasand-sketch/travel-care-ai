'use client';

import { useHealthStore } from '@/store/healthStore';
import { assessBloodSugar } from '@/lib/ai/healthAdvisor';

export function useHealthMonitor() {
  const { records, latestBloodSugar, addRecord, setLatestBloodSugar } =
    useHealthStore();

  const recordBloodSugar = (value: number) => {
    const assessment = assessBloodSugar(value);
    setLatestBloodSugar(value);
    addRecord({
      recordType: 'BLOOD_SUGAR',
      value,
      alertLevel: assessment.level,
      recordedAt: new Date().toISOString(),
    });
    return assessment;
  };

  return {
    records,
    latestBloodSugar,
    recordBloodSugar,
    assessment: latestBloodSugar
      ? assessBloodSugar(latestBloodSugar)
      : null,
  };
}
