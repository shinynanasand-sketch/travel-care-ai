import { assessBloodSugar } from '@/lib/ai/healthAdvisor';
import type { HealthProfileInput } from '@/types/health.types';

const CONDITION_LABELS: Record<string, string> = {
  DIABETES_TYPE1: '당뇨병 1형',
  DIABETES_TYPE2: '당뇨병 2형',
  HYPERTENSION: '고혈압',
  HEART_DISEASE: '심장질환',
  VEGAN: '비건',
  VEGETARIAN: '채식',
  PESCATARIAN: '페스코',
  HALAL: '할랄',
  FOOD_ALLERGY: '식품 알레르기',
};

const ACTIVITY_LABELS: Record<string, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
};

export interface MedicalSummary {
  bloodSugar: number | null;
  crisisLabel: string;
  crisisAction: string;
  isCrisis: boolean;
  profileLines: string[];
  displayText: string;
}

function getDiabetesLabel(conditions: string[]): string | null {
  if (conditions.includes('DIABETES_TYPE1')) return CONDITION_LABELS.DIABETES_TYPE1;
  if (conditions.includes('DIABETES_TYPE2')) return CONDITION_LABELS.DIABETES_TYPE2;
  return null;
}

function getCrisisLabel(level: string, bloodSugar: number): string {
  if (level === 'EMERGENCY') {
    if (bloodSugar < 54) return '저혈당 응급 (Hypoglycemia Emergency)';
    return '응급 상황 (Emergency)';
  }
  if (level === 'DANGER' && bloodSugar < 70) {
    return '저혈당 위험 (Hypoglycemia)';
  }
  if (level === 'DANGER') return '고혈당 위험 (Hyperglycemia)';
  if (level === 'WARNING') return '혈당 주의 (Blood Sugar Warning)';
  if (level === 'CAUTION') return '혈당 경계 (Blood Sugar Caution)';
  return '정상 범위 (Normal)';
}

export function buildMedicalSummary(
  name: string,
  healthProfile: HealthProfileInput | null,
  bloodSugar: number | null
): MedicalSummary {
  const profileLines: string[] = [`환자명: ${name}`];

  if (healthProfile) {
    const diabetesLabel = getDiabetesLabel(healthProfile.conditions);
    if (diabetesLabel) {
      profileLines.push(`질환: ${diabetesLabel}`);
    }

    const otherConditions = healthProfile.conditions
      .filter((c) => !c.startsWith('DIABETES'))
      .map((c) => CONDITION_LABELS[c] ?? c);
    if (otherConditions.length > 0) {
      profileLines.push(`기타: ${otherConditions.join(', ')}`);
    }

    profileLines.push(
      `인슐린 사용: ${healthProfile.insulinUser ? '예' : '아니오'}`,
      `활동 수준: ${ACTIVITY_LABELS[healthProfile.activityLevel] ?? healthProfile.activityLevel}`
    );

    if (healthProfile.medications.length > 0) {
      profileLines.push(`복용 약물: ${healthProfile.medications.join(', ')}`);
    }
    if (healthProfile.restrictions.length > 0) {
      profileLines.push(`식이 제한: ${healthProfile.restrictions.join(', ')}`);
    }
  } else {
    profileLines.push('질환: 프로필 미등록');
  }

  if (bloodSugar === null) {
    return {
      bloodSugar: null,
      crisisLabel: '혈당 미기록',
      crisisAction: '최근 혈당 기록이 없습니다. 여행 중 모니터링에서 혈당을 입력해 주세요.',
      isCrisis: false,
      profileLines,
      displayText: [
        '【의료진 확인용】',
        '',
        ...profileLines,
        '',
        '현재 혈당: 기록 없음',
      ].join('\n'),
    };
  }

  const assessment = assessBloodSugar(bloodSugar);
  const crisisLabel = getCrisisLabel(assessment.level, bloodSugar);
  const crisisAction = assessment.action ?? '특별 조치 불필요';
  const isCrisis = ['EMERGENCY', 'DANGER', 'WARNING'].includes(assessment.level);

  const displayText = [
    '【의료진 확인용】',
    '',
    crisisLabel,
    `현재 혈당: ${bloodSugar} mg/dL`,
    `권장 조치: ${crisisAction}`,
    '',
    ...profileLines,
    '',
    '※ 본 정보는 참고용이며 의료 진단·처방을 대체하지 않습니다.',
  ].join('\n');

  return {
    bloodSugar,
    crisisLabel,
    crisisAction,
    isCrisis,
    profileLines,
    displayText,
  };
}
