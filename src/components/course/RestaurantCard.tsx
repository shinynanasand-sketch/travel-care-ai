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
  contentId?: string;
  safetyLevel: Schedule['safetyLevel'];
  veganLevel?: Schedule['veganLevel'];
  isVeganGuaranteed?: Schedule['isVeganGuaranteed'];
  safetyReason: string;
  openTime?: string;
  menuAnalysis?: Schedule['menuAnalysis'];
}

export function RestaurantCard({
  title,
  address,
  firstmenu,
  hookLine,
  imageUrl,
  contentId,
  safetyLevel,
  veganLevel,
  isVeganGuaranteed,
  safetyReason,
  openTime,
  menuAnalysis,
}: RestaurantCardProps) {
  const isRed = safetyLevel === 'RED';
  const [careOpen, setCareOpen] = useState(isRed);
  const isSample = Boolean(contentId?.startsWith('mock-'));
  const veganItems = menuAnalysis?.veganItems?.filter(Boolean).slice(0, 3) ?? [];
  const nonVegan =
    menuAnalysis?.nonVeganIngredients?.filter(Boolean).slice(0, 3) ?? [];

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
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">🍽️ {title}</CardTitle>
          {isSample && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
              샘플
            </span>
          )}
        </div>
        {isVeganGuaranteed === false && (
          <div className="mt-2 rounded-lg border-2 border-orange-400 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900">
            ⚠️ 주변에 비건 식당이 없어 대안으로 안내합니다
          </div>
        )}
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
        {(veganItems.length > 0 || nonVegan.length > 0 || menuAnalysis?.recommendation) && (
          <div className="space-y-1 rounded-md bg-emerald-50/80 px-2 py-1.5 text-xs text-emerald-950">
            {veganItems.length > 0 && (
              <p>
                <span className="font-semibold">추천 메뉴:</span>{' '}
                {veganItems.join(', ')}
              </p>
            )}
            {nonVegan.length > 0 && (
              <p>
                <span className="font-semibold">주의 재료:</span>{' '}
                {nonVegan.join(', ')}
              </p>
            )}
            {menuAnalysis?.recommendation && (
              <p className="text-emerald-900/90">{menuAnalysis.recommendation}</p>
            )}
          </div>
        )}
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
