'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseCard } from '@/components/course/CourseCard';
import { AlternativePlacesStrip } from '@/components/course/AlternativePlacesStrip';
import { MedicalDiagnosticsBanner } from '@/components/medical/MedicalDiagnosticsBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { GenerateCourseResponse } from '@/types/course.types';

export default function PlanResultPage() {
  const router = useRouter();
  const {
    course,
    destination,
    veganFilter,
    setVeganFilter,
    lastRequest,
    setCourse,
  } = useTravelPlanStore();
  const { hasCondition, userId, healthProfile } = useUserProfileStore();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  if (!course) {
    return (
      <div className="space-y-4 text-center">
        <p>생성된 코스가 없습니다.</p>
        <Button onClick={() => router.push('/plan')}>코스 만들기</Button>
      </div>
    );
  }

  const editCourse = async (
    action: 'regenerate_day' | 'swap',
    dayIndex: number,
    contentId?: string
  ) => {
    const request =
      lastRequest ??
      (destination && healthProfile
        ? {
            userId,
            destination: {
              areaCode: destination.areaCode,
              name: destination.name,
              ...(destination.sigunguCode
                ? { sigunguCode: destination.sigunguCode }
                : {}),
            },
            period: {
              startDate: course.days[0]?.date ?? '',
              endDate: course.days[course.days.length - 1]?.date ?? '',
              days: course.days.length,
            },
            healthProfile,
            travelStyle: lastRequest?.travelStyle ?? '힐링',
          }
        : null);

    if (!request?.period.startDate) {
      alert('일정 편집을 위해 코스를 다시 생성해 주세요.');
      return;
    }

    const key = `${action}-${dayIndex}-${contentId ?? ''}`;
    setBusyKey(key);
    try {
      const res = await fetch('/api/course/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          request,
          dayIndex,
          contentId,
          days: course.days,
          courseId: course.courseId,
          medicalFacilities: course.medicalFacilities,
          medicalMeta: course.medicalMeta,
          hasVeganOptions: course.hasVeganOptions,
          warnings: course.warnings,
          alternatives: course.alternatives,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '일정 수정에 실패했습니다.');
      }
      const next = (await res.json()) as GenerateCourseResponse;
      setCourse(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : '일정 수정에 실패했습니다.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-lg">
        <p className="text-sm font-medium text-emerald-100">AI 맞춤 여행 코스</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {destination?.name ?? '여행'} 코스
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
            안전 점수 {course.overallSafetyScore}점
          </span>
          {course.hasVeganOptions && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">
              🌱 비건 옵션
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-emerald-50/90">
          장소를 바꾸거나 하루만 다시 뽑을 수 있습니다.
        </p>
      </div>

      <MedicalDiagnosticsBanner
        meta={course.medicalMeta}
        label="코스 의료(여행지·일정 좌표)"
      />

      {hasCondition('VEGAN') && (
        <label className="flex items-center gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            checked={veganFilter}
            onChange={(e) => setVeganFilter(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-base">🌱 비건 식당만 보기</span>
        </label>
      )}

      {course.warnings.map((w, i) => (
        <Card key={i} className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-3 text-sm">{w.message}</CardContent>
        </Card>
      ))}

      {course.days.map((day, dayIndex) => (
        <CourseCard
          key={day.day}
          dayCourse={day}
          veganFilter={veganFilter}
          busyKey={busyKey}
          onRegenerateDay={() => editCourse('regenerate_day', dayIndex)}
          onSwapPlace={(contentId) =>
            editCourse('swap', dayIndex, contentId)
          }
        />
      ))}

      {course.alternatives && course.alternatives.length > 0 && (
        <AlternativePlacesStrip places={course.alternatives} />
      )}

      <div className="space-y-2">
        <h2 className="font-semibold">주변 의료시설</h2>
        {course.medicalFacilities.slice(0, 3).map((f) => (
          <div key={f.name} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              {f.type === 'HOSPITAL' ? '🏥' : '💊'} {f.name}
              {f.distanceM != null ? ` — ${f.distanceM}m` : ''}
              {f.source && f.source !== 'hira' ? (
                <span className="ml-1 text-[10px] text-gray-500">
                  ({f.source === 'kakao' ? '카카오' : '샘플'})
                </span>
              ) : null}
            </p>
            {f.address ? <p className="text-xs text-gray-600">{f.address}</p> : null}
            {f.phone ? (
              <a
                href={`tel:${f.phone.replace(/[^0-9+]/g, '')}`}
                className="text-xs text-blue-700"
              >
                {f.phone}
              </a>
            ) : null}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={() => router.push('/travel')}>
        여행 시작하기
      </Button>
    </div>
  );
}
