import type { BloodSugarAssessment } from '@/types/health.types';

export function assessBloodSugar(value: number): BloodSugarAssessment {
  if (value < 54) return { level: 'EMERGENCY', action: '즉시 119 연락' };
  if (value < 70) return { level: 'DANGER', action: '즉시 당 보충 + 보호자 알림' };
  if (value > 300) return { level: 'DANGER', action: '즉시 의료기관 방문' };
  if (value > 250) return { level: 'WARNING', action: '활동 중단' };
  if (value > 180) return { level: 'CAUTION', action: '야외 활동 자제' };
  return { level: 'NORMAL', action: null };
}

export function shouldNotifyGuardian(level: string): boolean {
  return ['DANGER', 'EMERGENCY', 'WARNING'].includes(level);
}
