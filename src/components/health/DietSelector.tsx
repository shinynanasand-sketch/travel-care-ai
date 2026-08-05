'use client';

import type { ConditionType } from '@/types/health.types';
import { cn } from '@/lib/utils/cn';

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
        복합 선택 가능 (예: 당뇨 + 비건). AI 분석은 참고용이며 의료 진단이 아닙니다.
      </p>
    </div>
  );
}
