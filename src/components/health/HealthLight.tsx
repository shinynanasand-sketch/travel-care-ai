'use client';

import type { SafetyLevel } from '@/types/health.types';

const config: Record<SafetyLevel, { emoji: string; label: string; color: string }> = {
  GREEN: { emoji: '🟢', label: '안전', color: 'text-green-700 bg-green-50' },
  YELLOW: { emoji: '🟡', label: '주의', color: 'text-yellow-700 bg-yellow-50' },
  RED: { emoji: '🔴', label: '위험', color: 'text-red-700 bg-red-50' },
};

interface HealthLightProps {
  level: SafetyLevel;
  reason: string;
}

export function HealthLight({ level, reason }: HealthLightProps) {
  const { emoji, label, color } = config[level];
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${color}`}>
      <span>{emoji}</span>
      <span className="font-medium">{label}</span>
      <span className="text-xs opacity-80">{reason}</span>
    </div>
  );
}
