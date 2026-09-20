'use client';

import { useState } from 'react';
import { HealthLight } from '@/components/health/HealthLight';
import { PlaceThumbnail } from '@/components/course/PlaceThumbnail';
import type { Schedule } from '@/types/course.types';
import type { AccessibilityInfo, AccessibilityLevel } from '@/types/tourapi.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AttractionCardProps {
  title: string;
  address: string;
  hookLine?: string;
  imageUrl?: string;
  safetyLevel: Schedule['safetyLevel'];
  safetyReason: string;
  healthTips?: string[];
  accessibility?: AccessibilityInfo;
}

const LEVEL_STYLE: Record<
  AccessibilityLevel,
  { label: string; className: string }
> = {
  HIGH: { label: '무장애 우수', className: 'bg-emerald-100 text-emerald-700' },
  MEDIUM: { label: '무장애 보통', className: 'bg-amber-100 text-amber-700' },
  LOW: { label: '무장애 샘플·확인 필요', className: 'bg-rose-100 text-rose-700' },
};

function isAvailable(value?: string): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length === 0) return false;
  return !['없음', '불가', '미제공', 'N'].some((neg) => v.includes(neg));
}

export function AttractionCard({
  title,
  address,
  hookLine,
  imageUrl,
  safetyLevel,
  safetyReason,
  healthTips,
  accessibility,
}: AttractionCardProps) {
  const [careOpen, setCareOpen] = useState(false);
  const features: Array<{ icon: string; label: string; value?: string }> = [
    { icon: '♿', label: '휠체어', value: accessibility?.wheelchair },
    { icon: '🚪', label: '무단차 출입구', value: accessibility?.exit },
    { icon: '🛗', label: '엘리베이터', value: accessibility?.elevator },
    { icon: '🚻', label: '장애인 화장실', value: accessibility?.restroom },
    { icon: '🅿️', label: '전용 주차', value: accessibility?.parking },
    { icon: '🚌', label: '대중교통 접근', value: accessibility?.publictransport },
    { icon: '🦯', label: '점자블록', value: accessibility?.braileblock },
    { icon: '🔊', label: '오디오 가이드', value: accessibility?.audioguide },
  ];
  const availableFeatures = features.filter((f) => isAvailable(f.value));

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <PlaceThumbnail
        src={imageUrl}
        alt={title}
        kind="ATTRACTION"
        className="h-44 w-full rounded-none rounded-t-lg"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🏛️ {title}</CardTitle>
        {hookLine && <p className="text-sm font-medium text-teal-900">{hookLine}</p>}
        <p className="text-sm text-gray-600">{address}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {safetyLevel === 'RED' || safetyLevel === 'YELLOW' ? (
          <HealthLight level={safetyLevel} reason={safetyReason} />
        ) : null}

        <button
          type="button"
          className="text-xs text-gray-500 underline-offset-2 hover:underline"
          onClick={() => setCareOpen((v) => !v)}
        >
          {careOpen ? '안심·무장애 정보 접기' : '안심·무장애 정보'}
        </button>

        {careOpen && (
          <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-2">
            {accessibility?.level && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[accessibility.level].className}`}
              >
                {LEVEL_STYLE[accessibility.level].label}
              </span>
            )}
            {safetyLevel === 'GREEN' && (
              <HealthLight level={safetyLevel} reason={safetyReason} />
            )}
            {availableFeatures.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableFeatures.map((f) => (
                  <span
                    key={f.label}
                    className="rounded-md bg-white px-2 py-0.5 text-xs text-gray-700"
                    title={f.value}
                  >
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
            )}
            {healthTips && healthTips.length > 0 && (
              <ul className="text-xs text-gray-600">
                {healthTips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            )}
            {!accessibility && (
              <p className="text-xs text-gray-500">{safetyReason}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
