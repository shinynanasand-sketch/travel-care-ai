'use client';

import type { DayCourse, Schedule } from '@/types/course.types';
import { RestaurantCard } from './RestaurantCard';
import { AttractionCard } from './AttractionCard';
import { WellnessCard } from './WellnessCard';
import { KakaoMap } from '@/components/map/KakaoMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  distanceMeters,
  estimateWalkMinutes,
  formatDistanceM,
  isValidCoord,
} from '@/lib/geo/distance';

interface CourseCardProps {
  dayCourse: DayCourse;
  veganFilter?: boolean;
}

function scheduleMarkers(schedules: Schedule[]) {
  return schedules
    .filter((s) => isValidCoord(s.coordinates))
    .map((s) => ({
      lat: s.coordinates.lat,
      lng: s.coordinates.lng,
      title: `${s.time} ${s.title}`,
      type:
        s.type === 'RESTAURANT'
          ? ('vegan' as const)
          : s.type === 'MEDICAL'
            ? ('medical' as const)
            : ('default' as const),
    }));
}

function NearbyMedicalBlock({ schedule }: { schedule: Schedule }) {
  const items = (schedule.nearbyMedical ?? []).slice(0, 2);
  if (items.length === 0) return null;
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-gray-700">
      <p className="mb-1 font-medium text-blue-900">이 장소 근처 의료</p>
      <ul className="space-y-1">
        {items.map((f, i) => (
          <li key={`${f.name}-${i}`}>
            {f.type === 'PHARMACY' ? '💊' : '🏥'} {f.name}
            {f.distanceM != null ? ` · ${formatDistanceM(f.distanceM)}` : ''}
            {f.phone ? ` · ${f.phone}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DistanceToNext({ from, to }: { from: Schedule; to: Schedule }) {
  if (!isValidCoord(from.coordinates) || !isValidCoord(to.coordinates)) {
    return null;
  }
  const m = distanceMeters(from.coordinates, to.coordinates);
  const walk = estimateWalkMinutes(m);
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-gray-600">
      <span className="h-6 w-px bg-gray-300" aria-hidden />
      <span>
        다음까지 직선 약 {formatDistanceM(m)}
        {walk > 0 ? ` · 도보 약 ${walk}분(추정)` : ''}
      </span>
    </div>
  );
}

export function CourseCard({ dayCourse, veganFilter }: CourseCardProps) {
  const schedules = veganFilter
    ? dayCourse.schedules.filter(
        (s) =>
          s.type !== 'RESTAURANT' ||
          (s.veganLevel && s.veganLevel !== 'NOT_VEGAN')
      )
    : dayCourse.schedules;

  const markers = scheduleMarkers(schedules);
  const mapCenter = markers[0]
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : schedules.find((s) => isValidCoord(s.coordinates))?.coordinates ?? {
        lat: 37.5665,
        lng: 126.978,
      };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Day {dayCourse.day} — {dayCourse.date}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {markers.length > 0 && (
          <div className="space-y-1">
            <KakaoMap center={mapCenter} markers={markers} height="220px" />
            <p className="text-[11px] text-gray-500">
              이날 일정 위치 (마커). 구간 거리는 직선 기준이며 실제 도보·차량 경로와 다를 수
              있습니다.
            </p>
          </div>
        )}

        {schedules.map((schedule, i) => (
          <div key={`${schedule.contentId}-${i}`} className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{schedule.time}</p>
            {schedule.type === 'RESTAURANT' && (
              <RestaurantCard
                title={schedule.title}
                address={schedule.address}
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
                {schedule.address ? (
                  <p className="mt-1 text-xs text-gray-600">{schedule.address}</p>
                ) : null}
              </div>
            )}
            {schedule.type === 'MEDICAL' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                🏥 {schedule.title}
                {schedule.address ? (
                  <p className="mt-1 text-xs text-gray-600">{schedule.address}</p>
                ) : null}
                <p className="mt-1 text-xs text-gray-600">{schedule.safetyReason}</p>
              </div>
            )}

            <NearbyMedicalBlock schedule={schedule} />

            {i < schedules.length - 1 && (
              <DistanceToNext from={schedule} to={schedules[i + 1]} />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
