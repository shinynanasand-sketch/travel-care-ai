'use client';

import { useMemo, useState } from 'react';
import type { DayCourse, Schedule } from '@/types/course.types';
import { RestaurantCard } from './RestaurantCard';
import { AttractionCard } from './AttractionCard';
import { WellnessCard } from './WellnessCard';
import { KakaoMap } from '@/components/map/KakaoMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  distanceMeters,
  formatDistanceM,
  formatTravelHint,
  isValidCoord,
} from '@/lib/geo/distance';

interface CourseCardProps {
  dayCourse: DayCourse;
  veganFilter?: boolean;
  busyKey?: string | null;
  onRegenerateDay?: () => void;
  onSwapPlace?: (contentId: string) => void;
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
  const [open, setOpen] = useState(false);
  if (schedule.type === 'REST') return null;
  const items = (schedule.nearbyMedical ?? []).slice(0, 2);

  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-left text-[11px] text-gray-400 underline-offset-2 hover:underline"
      >
        {open
          ? '이 장소 기준 의료시설을 찾지 못했습니다. (여행중→주변에서 GPS 확인)'
          : '안심 · 근처 의료'}
      </button>
    );
  }

  const source = items.find((f) => f.source)?.source;
  return (
    <div className="text-xs">
      <button
        type="button"
        className="text-gray-500 underline-offset-2 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '근처 의료 접기' : '안심 · 근처 의료'}
      </button>
      {open && (
        <div className="mt-1 rounded-md border border-blue-100 bg-blue-50/80 px-3 py-2 text-gray-700">
          <p className="mb-1 font-medium text-blue-900">
            일정 좌표 기준
            {source && source !== 'hira' ? (
              <span className="ml-1 rounded bg-blue-200/80 px-1 py-0.5 text-[10px]">
                {source === 'kakao' ? '카카오' : '샘플'}
              </span>
            ) : null}
          </p>
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
      )}
    </div>
  );
}

function DistanceToNext({ from, to }: { from: Schedule; to: Schedule }) {
  if (!isValidCoord(from.coordinates) || !isValidCoord(to.coordinates)) {
    return null;
  }
  const m = distanceMeters(from.coordinates, to.coordinates);
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-gray-600">
      <span className="h-6 w-px bg-gray-300" aria-hidden />
      <span>{formatTravelHint(m)}</span>
    </div>
  );
}

export function CourseCard({
  dayCourse,
  veganFilter,
  busyKey,
  onRegenerateDay,
  onSwapPlace,
}: CourseCardProps) {
  const schedules = useMemo(() => {
    const filtered = veganFilter
      ? dayCourse.schedules.filter(
          (s) =>
            s.type !== 'RESTAURANT' ||
            s.isVeganGuaranteed === false ||
            (s.veganLevel && s.veganLevel !== 'NOT_VEGAN')
        )
      : dayCourse.schedules;
    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [dayCourse.schedules, veganFilter]);

  const markers = scheduleMarkers(schedules);
  const mapCenter = markers[0]
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : schedules.find((s) => isValidCoord(s.coordinates))?.coordinates ?? {
        lat: 37.5665,
        lng: 126.978,
      };

  const dayBusy = busyKey?.startsWith(`regenerate_day-${dayCourse.day - 1}`);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>
          Day {dayCourse.day} — {dayCourse.date}
          {dayCourse.themeLabel ? (
            <span className="ml-2 text-sm font-normal text-teal-700">
              · {dayCourse.themeLabel}
            </span>
          ) : null}
        </CardTitle>
        {onRegenerateDay ? (
          <button
            type="button"
            disabled={Boolean(busyKey)}
            onClick={onRegenerateDay}
            className="text-left text-xs text-teal-800 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {dayBusy ? '이 날 다시 만드는 중…' : '이 날만 다시 뽑기'}
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {markers.length > 0 && (
          <div className="space-y-1">
            <KakaoMap center={mapCenter} markers={markers} height="220px" />
            <p className="text-[11px] text-gray-500">
              이날 일정(시간순). 구간 거리는 직선 기준입니다.
            </p>
          </div>
        )}

        {schedules.map((schedule, i) => {
          const swapBusy =
            busyKey ===
            `swap-${dayCourse.day - 1}-${schedule.contentId}`;
          const canSwap =
            onSwapPlace &&
            (schedule.type === 'ATTRACTION' ||
              schedule.type === 'RESTAURANT' ||
              schedule.type === 'WELLNESS');

          return (
            <div key={`${schedule.contentId}-${i}`} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-500">
                  {schedule.time}
                </p>
                {canSwap ? (
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() => onSwapPlace(schedule.contentId)}
                    className="shrink-0 text-[11px] text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {swapBusy ? '교체 중…' : '다른 곳으로'}
                  </button>
                ) : null}
              </div>
              {schedule.type === 'RESTAURANT' && (
                <RestaurantCard
                  title={schedule.title}
                  address={schedule.address}
                  firstmenu={schedule.menuAnalysis?.menuItems[0]?.name}
                  hookLine={schedule.hookLine}
                  imageUrl={schedule.imageUrl}
                  contentId={schedule.contentId}
                  safetyLevel={schedule.safetyLevel}
                  veganLevel={schedule.veganLevel}
                  isVeganGuaranteed={schedule.isVeganGuaranteed}
                  safetyReason={schedule.safetyReason}
                  menuAnalysis={schedule.menuAnalysis}
                />
              )}
              {schedule.type === 'ATTRACTION' && (
                <AttractionCard
                  title={schedule.title}
                  address={schedule.address}
                  hookLine={schedule.hookLine}
                  imageUrl={schedule.imageUrl}
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
                  hookLine={schedule.hookLine}
                  imageUrl={schedule.imageUrl}
                  safetyReason={schedule.safetyReason}
                  healthTips={schedule.healthTips}
                  theme={schedule.wellnessTheme}
                />
              )}
              {schedule.type === 'REST' && (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm">
                  🚶 {schedule.title}
                  {schedule.hookLine ? (
                    <p className="mt-0.5 text-gray-800">{schedule.hookLine}</p>
                  ) : (
                    <p className="mt-0.5 text-gray-700">
                      — {schedule.safetyReason}
                    </p>
                  )}
                  {schedule.address ? (
                    <p className="mt-1 text-xs text-gray-600">
                      {schedule.address}
                    </p>
                  ) : null}
                </div>
              )}
              {schedule.type === 'MEDICAL' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                  🏥 {schedule.title}
                  {schedule.address ? (
                    <p className="mt-1 text-xs text-gray-600">
                      {schedule.address}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-600">
                    {schedule.safetyReason}
                  </p>
                </div>
              )}

              <NearbyMedicalBlock schedule={schedule} />

              {i < schedules.length - 1 && (
                <DistanceToNext from={schedule} to={schedules[i + 1]} />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
