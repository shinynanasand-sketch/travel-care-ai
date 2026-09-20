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

  const recordBloodPressure = (systolic: number, diastolic: number) => {
    const alertLevel =
      systolic >= 180 || diastolic >= 120
        ? 'DANGER'
        : systolic >= 140 || diastolic >= 90
          ? 'WARNING'
          : 'NORMAL';
    addRecord({
      recordType: 'BLOOD_PRESSURE',
      value: systolic,
      value2: diastolic,
      alertLevel,
      recordedAt: new Date().toISOString(),
    });
    return { level: alertLevel };
  };

  return {
    records,
    latestBloodSugar,
    recordBloodSugar,
    recordBloodPressure,
    assessment: latestBloodSugar
      ? assessBloodSugar(latestBloodSugar)
      : null,
  };
}
