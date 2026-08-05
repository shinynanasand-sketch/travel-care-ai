'use client';

import type { VeganLevel } from '@/types/health.types';

const config: Record<VeganLevel, { emoji: string; label: string; color: string }> = {
  FULL_VEGAN: { emoji: '🟢', label: '완전 비건', color: 'text-green-700 bg-green-50' },
  PARTIAL_VEGAN: { emoji: '🌿', label: '부분 비건', color: 'text-emerald-700 bg-emerald-50' },
  CHECK_NEEDED: { emoji: '🟡', label: '확인 필요', color: 'text-yellow-700 bg-yellow-50' },
  NOT_VEGAN: { emoji: '🔴', label: '비건 불가', color: 'text-red-700 bg-red-50' },
};

interface VeganLightProps {
  level: VeganLevel;
  reason?: string;
}

export function VeganLight({ level, reason }: VeganLightProps) {
  const { emoji, label, color } = config[level];
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${color}`}>
      <span>{emoji}</span>
      <span className="font-medium">{label}</span>
      {reason && <span className="text-xs opacity-80">{reason}</span>}
    </div>
  );
}
