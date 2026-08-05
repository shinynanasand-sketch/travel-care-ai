'use client';

import { useRouter } from 'next/navigation';
import { CourseCard } from '@/components/course/CourseCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useUserProfileStore } from '@/store/userProfileStore';

export default function PlanResultPage() {
  const router = useRouter();
  const { course, destination, veganFilter, setVeganFilter } = useTravelPlanStore();
  const { hasCondition } = useUserProfileStore();

  if (!course) {
    return (
      <div className="space-y-4 text-center">
        <p>생성된 코스가 없습니다.</p>
        <Button onClick={() => router.push('/plan')}>코스 만들기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          {destination?.name} 여행 코스
        </h1>
        <p className="text-sm text-gray-500">
          안전 점수: {course.overallSafetyScore}점
          {course.hasVeganOptions && ' · 비건 옵션 포함'}
        </p>
      </div>

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

      {course.days.map((day) => (
        <CourseCard key={day.day} dayCourse={day} veganFilter={veganFilter} />
      ))}

      <div className="space-y-2">
        <h2 className="font-semibold">주변 의료시설</h2>
        {course.medicalFacilities.slice(0, 3).map((f) => (
          <div key={f.name} className="rounded-lg border p-3 text-sm">
            {f.type === 'HOSPITAL' ? '🏥' : '💊'} {f.name} — {f.distanceM}m
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={() => router.push('/travel')}>
        여행 시작하기
      </Button>
    </div>
  );
}
