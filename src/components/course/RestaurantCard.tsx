'use client';

import { HealthLight } from '@/components/health/HealthLight';
import { VeganLight } from '@/components/health/VeganLight';
import type { Schedule } from '@/types/course.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantCardProps {
  title: string;
  address?: string;
  firstmenu?: string;
  safetyLevel: Schedule['safetyLevel'];
  veganLevel?: Schedule['veganLevel'];
  safetyReason: string;
  openTime?: string;
}

export function RestaurantCard({
  title,
  address,
  firstmenu,
  safetyLevel,
  veganLevel,
  safetyReason,
  openTime,
}: RestaurantCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🍽️ {title}</CardTitle>
        {address && <p className="text-xs text-gray-500">{address}</p>}
        {firstmenu && <p className="text-sm text-gray-600">대표: {firstmenu}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <HealthLight level={safetyLevel} reason={safetyReason} />
          {veganLevel && <VeganLight level={veganLevel} />}
        </div>
        {openTime && <p className="text-xs text-gray-500">영업: {openTime}</p>}
      </CardContent>
    </Card>
  );
}
