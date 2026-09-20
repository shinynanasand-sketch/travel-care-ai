'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileGateLink } from '@/components/common/ProfileGateLink';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { hasHealthOrDietConditions } from '@/lib/profile/healthConditions';

export default function HomePage() {
  const hydrated = useUserProfileHydrated();
  const healthProfile = useUserProfileStore((s) => s.healthProfile);
  const course = useTravelPlanStore((s) => s.course);
  const hasProfile =
    hydrated && hasHealthOrDietConditions(healthProfile?.conditions);
  const hasCourse = hydrated && Boolean(course);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
        <h1 className="text-2xl font-bold">여행 속 주치의</h1>
        <p className="mt-2 text-sm opacity-90">
          만성질환자·비건을 위한 건강 맞춤형 여행 코스
        </p>
        <p className="mt-4 text-xs opacity-75">
          AI 분석은 참고용이며 의료 진단·처방이 아닙니다.
        </p>
      </section>

      <div className="grid gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💉 만성질환자</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            당뇨·고혈압 맞춤 식당 추천, 의료시설 안전망, 혈당 모니터링
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🌱 비건·채식</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            비건 식당 검색, 4단계 비건 신호등, 메뉴 AI 분석
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/profile">
          <Button
            variant={hasProfile ? 'outline' : 'default'}
            className="w-full"
            size="lg"
          >
            {hasProfile ? '1. 프로필 수정' : '1. 건강·식이 프로필 등록'}
          </Button>
        </Link>
        <ProfileGateLink href="/plan" className="block w-full">
          <Button
            variant={hasProfile && !hasCourse ? 'default' : 'outline'}
            className="w-full"
            size="lg"
          >
            {hasCourse ? '2. 여행 코스 다시 만들기' : '2. 여행 코스 만들기'}
          </Button>
        </ProfileGateLink>
        <ProfileGateLink href="/travel" className="block w-full">
          <Button
            variant={hasCourse ? 'default' : 'outline'}
            className="w-full"
            size="lg"
          >
            {hasCourse
              ? '3. 이어서 여행 중 모니터링'
              : '3. 여행 중 건강 모니터링'}
          </Button>
        </ProfileGateLink>
        {hasCourse && (
          <Link href="/plan/result">
            <Button variant="outline" className="w-full" size="lg">
              저장된 코스 보기
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
