'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInDays, addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  KOREA_REGIONS,
  METROPOLITAN_REGIONS,
  PROVINCE_REGIONS,
  getRegionByAreaCode,
} from '@/lib/data/korea-regions';
import {
  formatDestinationName,
  getSigungu,
  getSigunguList,
} from '@/lib/data/korea-sigungu';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useCourseGenerate } from '@/hooks/useCourseGenerate';
import { hasHealthOrDietConditions } from '@/lib/profile/healthConditions';
import { TRAVEL_STYLES, type TravelStyle } from '@/types/course.types';

/** Empty string = 시·도 전체 (광역시 기본) */
const CITY_WIDE = '';

const GENERATE_LOADING_STEPS = [
  'TourAPI에서 명소·식당 정보를 불러오는 중...',
  '사진이 있는 대표 장소를 선별하는 중...',
  'Gemini가 여행 취향에 맞는 코스를 구성하는 중...',
  '식단·안전 정보를 분석하는 중...',
  '주변 의료시설을 연결하는 중...',
  '거의 완료되었습니다. 조금만 기다려 주세요...',
];

export default function PlanPage() {
  const router = useRouter();
  const { userId, healthProfile } = useUserProfileStore();
  const { setCourse, setDestination, setPeriod, setLastRequest, course, destination } =
    useTravelPlanStore();
  const generate = useCourseGenerate();

  const [areaCode, setAreaCode] = useState(KOREA_REGIONS[0].areaCode);
  // 광역시: 시 전체 기본 / 도: 첫 시·군 기본
  const [sigunguCode, setSigunguCode] = useState(CITY_WIDE);
  const [startDate, setStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    format(addDays(new Date(), 2), 'yyyy-MM-dd')
  );
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('힐링');
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!generate.isPending) {
      setLoadingStep(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStep((s) => (s + 1) % GENERATE_LOADING_STEPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [generate.isPending]);

  const region = getRegionByAreaCode(areaCode);
  const isMetro = region.group === 'metropolitan';
  const sigunguList = useMemo(() => getSigunguList(areaCode), [areaCode]);
  const sigungu = sigunguCode
    ? getSigungu(areaCode, sigunguCode)
    : undefined;
  const destinationLabel = formatDestinationName(region, sigungu);
  const canGenerate = isMetro || Boolean(sigunguCode);

  const days = Math.max(
    1,
    differenceInDays(new Date(endDate), new Date(startDate)) + 1
  );

  const selectArea = (code: string) => {
    setAreaCode(code);
    const next = getRegionByAreaCode(code);
    if (next.group === 'metropolitan') {
      setSigunguCode(CITY_WIDE);
    } else {
      const list = getSigunguList(code);
      setSigunguCode(list[0]?.sigunguCode ?? CITY_WIDE);
    }
  };

  const handleGenerate = async () => {
    if (!healthProfile) {
      router.push('/profile?next=/plan');
      return;
    }
    if (!isMetro && !sigunguCode) {
      alert('시·군을 선택해 주세요. 도 단위는 면적이 넓어 시·군 선택이 필요합니다.');
      return;
    }

    const request = {
      userId,
      destination: {
        areaCode,
        ...(sigunguCode ? { sigunguCode } : {}),
        name: destinationLabel,
      },
      period: { startDate, endDate, days },
      healthProfile,
      travelStyle,
    };

    setGenerateError(null);

    try {
      const result = await generate.mutateAsync(request);
      setCourse(result);
      setLastRequest(request);
      setDestination({
        areaCode,
        ...(sigunguCode ? { sigunguCode } : {}),
        name: destinationLabel,
      });
      setPeriod({ startDate, endDate, days });
      router.push('/plan/result');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '코스 생성에 실패했습니다. 다시 시도해 주세요.';
      setGenerateError(message);
      alert(message);
    }
  };

  if (!healthProfile || !hasHealthOrDietConditions(healthProfile.conditions)) {
    return (
      <div className="space-y-4 text-center">
        <p>맞춤 코스를 위해 질환·식이 조건을 하나 이상 선택해 주세요.</p>
        <Button onClick={() => router.push('/profile?next=/plan')}>
          프로필 등록
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">여행 계획</h1>

      {course && (
        <div
          role="status"
          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-sm text-teal-900"
        >
          <p>
            저장된 코스가 있습니다
            {destination?.name ? ` (${destination.name})` : ''}.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full border-teal-300"
            onClick={() => router.push('/plan/result')}
          >
            저장된 코스 보기
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 광역 지역</CardTitle>
        </CardHeader>
        <CardContent className="max-h-56 space-y-4 overflow-y-auto">
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">광역시</p>
            <div className="grid grid-cols-2 gap-2">
              {METROPOLITAN_REGIONS.map((r) => (
                <button
                  key={r.areaCode}
                  type="button"
                  onClick={() => selectArea(r.areaCode)}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    areaCode === r.areaCode
                      ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-800'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">도</p>
            <div className="grid grid-cols-2 gap-2">
              {PROVINCE_REGIONS.map((r) => (
                <button
                  key={r.areaCode}
                  type="button"
                  onClick={() => selectArea(r.areaCode)}
                  className={`rounded-lg border p-3 text-left text-sm ${
                    areaCode === r.areaCode
                      ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-800'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            2. {isMetro ? '구 (선택)' : '시·군'}
            <span className="ml-2 text-xs font-normal text-gray-500">
              {region.name}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {sigunguList.length === 0 ? (
            <p className="text-sm text-gray-500">시·군 목록이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {isMetro && (
                <button
                  type="button"
                  onClick={() => setSigunguCode(CITY_WIDE)}
                  className={`rounded-lg border p-2.5 text-left text-sm sm:col-span-3 ${
                    sigunguCode === CITY_WIDE
                      ? 'border-teal-500 bg-teal-50 font-medium text-teal-900'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {region.shortName} 전체
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">
                    모든 구를 포함해 일정 구성
                  </span>
                </button>
              )}
              {sigunguList.map((s) => (
                <button
                  key={s.sigunguCode}
                  type="button"
                  onClick={() => setSigunguCode(s.sigunguCode)}
                  className={`rounded-lg border p-2.5 text-left text-sm ${
                    sigunguCode === s.sigunguCode
                      ? 'border-teal-500 bg-teal-50 font-medium text-teal-900'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">
            {isMetro
              ? '시 전체를 고르면 구를 넘나드는 일정이 됩니다. 특정 구만 보고 싶을 때만 구를 선택하세요.'
              : '도 단위보다 시·군을 고르면 동선이 현실적인 코스가 됩니다.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">여행 취향</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TRAVEL_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setTravelStyle(style)}
                className={`rounded-lg border p-2.5 text-left text-sm ${
                  travelStyle === style
                    ? 'border-violet-500 bg-violet-50 font-medium text-violet-900'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            사진이 있는 대표 명소 위주로, 선택한 취향에 맞게 코스를 구성합니다.
          </p>
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
            {destinationLabel} · {days}일 여행
          </p>
        </CardContent>
      </Card>

      {generateError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {generateError}
        </p>
      )}

      {generate.isPending && (
        <div
          role="status"
          className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/80 p-4"
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-teal-900">
              {GENERATE_LOADING_STEPS[loadingStep]}
            </p>
          </div>
          <p className="text-xs text-teal-800/80">
            실연동 모드에서는 30초~1분 정도 걸릴 수 있습니다. 창을 닫지 마세요.
          </p>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleGenerate}
        disabled={generate.isPending || !canGenerate}
      >
        {generate.isPending ? '코스 생성 중...' : '안전 코스 생성하기'}
      </Button>

      <p className="text-center text-xs text-gray-400">
        AI 분석은 참고용이며 의료 진단·처방이 아닙니다.
      </p>
    </div>
  );
}
