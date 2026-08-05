'use client';

import type { DayCourse } from '@/types/course.types';
import { RestaurantCard } from './RestaurantCard';
import { AttractionCard } from './AttractionCard';
import { WellnessCard } from './WellnessCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CourseCardProps {
  dayCourse: DayCourse;
  veganFilter?: boolean;
}

export function CourseCard({ dayCourse, veganFilter }: CourseCardProps) {
  const schedules = veganFilter
    ? dayCourse.schedules.filter(
        (s) =>
          s.type !== 'RESTAURANT' ||
          (s.veganLevel && s.veganLevel !== 'NOT_VEGAN')
      )
    : dayCourse.schedules;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Day {dayCourse.day} — {dayCourse.date}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.map((schedule, i) => (
          <div key={`${schedule.contentId}-${i}`} className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{schedule.time}</p>
            {schedule.type === 'RESTAURANT' && (
              <RestaurantCard
                title={schedule.title}
                firstmenu={schedule.menuAnalysis?.menuItems[0]?.name}
                safetyLevel={schedule.safetyLevel}
                veganLevel={schedule.veganLevel}
                safetyReason={schedule.safetyReason}
              />
            )}
            {schedule.type === 'ATTRACTION' && (
              <AttractionCard
                title={schedule.title}
                address={schedule.address}
                safetyLevel={schedule.safetyLevel}
                safetyReason={schedule.safetyReason}
                healthTips={schedule.healthTips}
                accessibility={schedule.accessibility}
              />
            )}
            {schedule.type === 'WELLNESS' && (
              <WellnessCard
                title={schedule.title}
                address={schedule.address}
                safetyReason={schedule.safetyReason}
                healthTips={schedule.healthTips}
                theme={schedule.wellnessTheme}
              />
            )}
            {schedule.type === 'REST' && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                🚶 {schedule.title} — {schedule.safetyReason}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
