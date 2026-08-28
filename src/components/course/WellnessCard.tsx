'use client';

import { PlaceThumbnail } from '@/components/course/PlaceThumbnail';
import type { WellnessTheme } from '@/types/tourapi.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WellnessCardProps {
  title: string;
  address: string;
  hookLine?: string;
  imageUrl?: string;
  safetyReason: string;
  healthTips?: string[];
  theme?: WellnessTheme;
}

const THEME_META: Record<WellnessTheme, { icon: string; label: string }> = {
  SPA: { icon: '♨️', label: '스파·온천' },
  HEALING: { icon: '🧘', label: '힐링·명상' },
  NATURE: { icon: '🌳', label: '자연·숲' },
  HANSIK: { icon: '🍲', label: '건강 한식' },
  FOOD: { icon: '🍽️', label: '맛집' },
  STAY: { icon: '🏡', label: '휴양 숙소' },
};

export function WellnessCard({
  title,
  address,
  hookLine,
  imageUrl,
  safetyReason,
  healthTips,
  theme,
}: WellnessCardProps) {
  const meta = theme ? THEME_META[theme] : { icon: '🌿', label: '웰니스' };

  return (
    <Card className="overflow-hidden border-teal-200 bg-teal-50/40 shadow-sm">
      <PlaceThumbnail
        src={imageUrl}
        alt={title}
        kind="WELLNESS"
        className="h-44 w-full rounded-none rounded-t-lg"
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {meta.icon} {title}
          </CardTitle>
          <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            {meta.label}
          </span>
        </div>
        {hookLine ? (
          <p className="text-sm text-teal-900">{hookLine}</p>
        ) : (
          <p className="text-sm text-teal-800">🌿 {safetyReason}</p>
        )}
        <p className="text-sm text-gray-600">{address}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {healthTips && healthTips.length > 0 && (
          <ul className="text-xs text-gray-600">
            {healthTips.map((tip) => (
              <li key={tip}>• {tip}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
