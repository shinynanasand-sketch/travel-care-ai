'use client';

import { useState } from 'react';
import { HealthLight } from '@/components/health/HealthLight';
import { VeganLight } from '@/components/health/VeganLight';
import { PlaceThumbnail } from '@/components/course/PlaceThumbnail';
import type { Schedule } from '@/types/course.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantCardProps {
  title: string;
  address?: string;
  firstmenu?: string;
  hookLine?: string;
  imageUrl?: string;
  safetyLevel: Schedule['safetyLevel'];
  veganLevel?: Schedule['veganLevel'];
  safetyReason: string;
  openTime?: string;
}

export function RestaurantCard({
  title,
  address,
  firstmenu,
  hookLine,
  imageUrl,
  safetyLevel,
  veganLevel,
  safetyReason,
  openTime,
}: RestaurantCardProps) {
  const isRed = safetyLevel === 'RED';
  const [careOpen, setCareOpen] = useState(isRed);

  return (
    <Card
      className={`overflow-hidden shadow-sm ${isRed ? 'border-red-300' : 'border-gray-200'}`}
    >
      <PlaceThumbnail
        src={imageUrl}
        alt={title}
        kind="RESTAURANT"
        className="h-44 w-full rounded-none rounded-t-lg"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🍽️ {title}</CardTitle>
        {hookLine && (
          <p className="text-sm font-medium text-amber-900">{hookLine}</p>
        )}
        {address && <p className="text-xs text-gray-500">{address}</p>}
        {firstmenu && !hookLine?.includes(firstmenu) && (
          <p className="text-sm text-gray-600">대표: {firstmenu}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <HealthLight level={safetyLevel} reason={isRed ? safetyReason : undefined} />
          {veganLevel && <VeganLight level={veganLevel} />}
        </div>
        {isRed && (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800">
            식이·건강상 주의: {safetyReason}
            {' — 가능하면 다른 식당을 권합니다.'}
          </p>
        )}
        {!isRed && (
          <div>
            <button
              type="button"
              className="text-xs text-gray-500 underline-offset-2 hover:underline"
              onClick={() => setCareOpen((v) => !v)}
            >
              {careOpen ? '안심 정보 접기' : '안심 정보 보기'}
            </button>
            {careOpen && (
              <p className="mt-1 text-xs text-gray-600">{safetyReason}</p>
            )}
          </div>
        )}
        {openTime && <p className="text-xs text-gray-500">영업: {openTime}</p>}
      </CardContent>
    </Card>
  );
}
