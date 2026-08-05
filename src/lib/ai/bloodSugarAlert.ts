import type { BloodSugarAssessment } from '@/types/health.types';

export function getBloodSugarAlertConfig(
  assessment: BloodSugarAssessment | null,
  value: number | null
): {
  bannerLevel: 'EMERGENCY' | 'WARNING' | null;
  actionLabel: string | null;
  onAction: (() => void) | null;
} {
  if (!assessment?.action || value === null) {
    return { bannerLevel: null, actionLabel: null, onAction: null };
  }

  const goNearby = () => {
    window.location.href = '/travel/nearby';
  };
  const call119 = () => {
    window.location.href = 'tel:119';
  };

  switch (assessment.level) {
    case 'EMERGENCY':
      return {
        bannerLevel: 'EMERGENCY',
        actionLabel: '119 연락',
        onAction: call119,
      };
    case 'DANGER':
      if (value < 70) {
        return {
          bannerLevel: 'EMERGENCY',
          actionLabel: '주변 약국 보기',
          onAction: goNearby,
        };
      }
      return {
        bannerLevel: 'EMERGENCY',
        actionLabel: '119 연락',
        onAction: call119,
      };
    case 'WARNING':
    case 'CAUTION':
      return {
        bannerLevel: 'WARNING',
        actionLabel: '주변 약국 보기',
        onAction: goNearby,
      };
    default:
      return { bannerLevel: null, actionLabel: null, onAction: null };
  }
}
