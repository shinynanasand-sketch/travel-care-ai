'use client';

import type { ConditionType } from '@/types/health.types';
import { cn } from '@/lib/utils/cn';

const CHRONIC_CONDITIONS: ConditionType[] = [
  'DIABETES_TYPE2',
  'DIABETES_TYPE1',
  'HYPERTENSION',
  'HEART_DISEASE',
];

const DIET_CONDITIONS: ConditionType[] = [
  'VEGAN',
  'VEGETARIAN',
  'PESCATARIAN',
  'HALAL',
  'FOOD_ALLERGY',
];

const GROUP_CONDITIONS: Record<string, ConditionType[]> = {
  만성질환: CHRONIC_CONDITIONS,
  식이유형: DIET_CONDITIONS,
};

const dietOptions: {
  id: ConditionType;
  label: string;
  icon: string;
  group: string;
}[] = [
  { id: 'DIABETES_TYPE2', label: '당뇨', icon: '💉', group: '만성질환' },
  { id: 'DIABETES_TYPE1', label: '당뇨1형', icon: '💉', group: '만성질환' },
  { id: 'HYPERTENSION', label: '고혈압', icon: '❤️', group: '만성질환' },
  { id: 'HEART_DISEASE', label: '심장질환', icon: '🫀', group: '만성질환' },
  { id: 'VEGAN', label: '비건', icon: '🌱', group: '식이유형' },
  { id: 'VEGETARIAN', label: '채식', icon: '🥗', group: '식이유형' },
  { id: 'PESCATARIAN', label: '페스코', icon: '🐟', group: '식이유형' },
  { id: 'HALAL', label: '할랄', icon: '☪️', group: '식이유형' },
  { id: 'FOOD_ALLERGY', label: '알레르기', icon: '⚠️', group: '식이유형' },
];

interface DietSelectorProps {
  selected: ConditionType[];
  onChange: (conditions: ConditionType[]) => void;
}

export function DietSelector({ selected, onChange }: DietSelectorProps) {
  const groups = ['만성질환', '식이유형'];

  const isGroupNoneSelected = (group: string) => {
    const groupIds = GROUP_CONDITIONS[group] ?? [];
    return !selected.some((id) => groupIds.includes(id));
  };

  const selectGroupNone = (group: string) => {
    const groupIds = GROUP_CONDITIONS[group] ?? [];
    onChange(selected.filter((id) => !groupIds.includes(id)));
  };

  const toggle = (id: ConditionType) => {
    onChange(
      selected.includes(id)
        ? selected.filter((c) => c !== id)
        : [...selected, id]
    );
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group}>
          <h3 className="mb-2 text-sm font-semibold text-gray-600">{group}</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectGroupNone(group)}
              className={cn(
                'col-span-2 flex min-h-[44px] items-center gap-2 rounded-lg border p-3 text-left text-base transition-colors',
                isGroupNoneSelected(group)
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <span className="text-xl">✨</span>
              <span>해당 없음(일반)</span>
            </button>
            {dietOptions
              .filter((o) => o.group === group)
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={cn(
                    'flex min-h-[44px] items-center gap-2 rounded-lg border p-3 text-left text-base transition-colors',
                    selected.includes(option.id)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-500">
        질환·식이 유형은 선택 사항입니다. 해당 없으면 &apos;해당 없음(일반)&apos;을
        누르거나 비워 두고 시작하세요. 복합 선택도 가능합니다 (예: 당뇨 + 비건).
        AI 분석은 참고용이며 의료 진단·처방이 아닙니다.
      </p>
    </div>
  );
}
