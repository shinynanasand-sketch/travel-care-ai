'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  KOREA_REGIONS,
  METROPOLITAN_REGIONS,
  PROVINCE_REGIONS,
} from '@/lib/data/korea-regions';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useCourseGenerate } from '@/hooks/useCourseGenerate';

export default function PlanPage() {
  const router = useRouter();
  const { userId, healthProfile } = useUserProfileStore();
  const { setCourse, setDestination, setPeriod } = useTravelPlanStore();
  const generate = useCourseGenerate();

  const [destination, setDestinationState] = useState(KOREA_REGIONS[0]);
  const [startDate, setStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(addDays(new Date(), 2), 'yyyy-MM-dd')
  );

  const days = Math.max(1, differenceInDays(new Date(endDate), new Date(startDate)) + 1);

  const handleGenerate = async () => {
    if (!healthProfile) {
      router.push('/profile');
      return;
    }

    const request = {
      userId,
      destination: { areaCode: destination.areaCode, name: destination.name },
      period: { startDate, endDate, days },
      healthProfile,
    };

    try {
      const result = await generate.mutateAsync(request);
      setCourse(result);
      setDestination({ areaCode: destination.areaCode, name: destination.name });
      setPeriod({ startDate, endDate, days });
      router.push('/plan/result');
    } catch {
      alert('코스 생성에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  if (!healthProfile) {
    return (
      <div className="space-y-4 text-center">
        <p>먼저 건강 프로필을 등록해 주세요.</p>
        <Button onClick={() => router.push('/profile')}>프로필 등록</Button>
      </div>
    );
  }

  const RegionButton = ({
    areaCode,
    name,
  }: {
    areaCode: string;
    name: string;
  }) => (
    <button
      type="button"
      onClick={() =>
        setDestinationState(
          KOREA_REGIONS.find((r) => r.areaCode === areaCode) ?? KOREA_REGIONS[0]
        )
      }
      className={`rounded-lg border p-3 text-left text-sm ${
        destination.areaCode === areaCode
          ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-800'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      {name}
    </button>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">여행 계획</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">여행지 (전국 17개)</CardTitle>
        </CardHeader>
        <CardContent className="max-h-72 space-y-4 overflow-y-auto">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">광역시</p>
            <div className="grid grid-cols-2 gap-2">
              {METROPOLITAN_REGIONS.map((r) => (
                <RegionButton key={r.areaCode} areaCode={r.areaCode} name={r.name} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">도</p>
            <div className="grid grid-cols-2 gap-2">
              {PROVINCE_REGIONS.map((r) => (
                <RegionButton key={r.areaCode} areaCode={r.areaCode} name={r.name} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm text-gray-600">시작일</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">종료일</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <p className="text-sm text-gray-500">
            {destination.name} · {days}일 여행
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleGenerate}
        disabled={generate.isPending}
      >
        {generate.isPending ? '코스 생성 중...' : '안전 코스 생성하기'}
      </Button>
    </div>
  );
}
