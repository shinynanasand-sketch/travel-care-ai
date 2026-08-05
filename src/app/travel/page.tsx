'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BloodSugarInput } from '@/components/health/BloodSugarInput';
import { AlertBanner } from '@/components/common/AlertBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getBloodSugarAlertConfig } from '@/lib/ai/bloodSugarAlert';

export default function TravelPage() {
  const router = useRouter();
  const { recordBloodSugar, assessment, latestBloodSugar } = useHealthMonitor();
  const { userId, healthProfile } = useUserProfileStore();
  const { course } = useTravelPlanStore();
  const { lat, lng } = useGeolocation();
  const [adjusting, setAdjusting] = useState(false);
  const [recordedMessage, setRecordedMessage] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const handleBloodSugar = async (value: number) => {
    const result = recordBloodSugar(value);
    setRecordedMessage(`혈당 ${value} mg/dL 기록되었습니다.`);
    setInputKey((k) => k + 1);

    if (healthProfile) {
      setAdjusting(true);
      try {
        if (result.level !== 'NORMAL') {
          const guardians = JSON.parse(
            localStorage.getItem('guardians') ?? '[]'
          ) as { fcmToken?: string }[];
          const guardianFcmTokens = guardians
            .map((g) => g.fcmToken)
            .filter((t): t is string => Boolean(t?.trim()));

          await fetch('/api/course/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: course?.courseId,
              userId,
              bloodSugar: value,
              conditions: healthProfile.conditions,
              currentLocation: lat && lng ? { lat, lng } : undefined,
              guardianFcmTokens,
            }),
          });
        }
        await fetch('/api/health/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            recordType: 'BLOOD_SUGAR',
            value,
            travelPlanId: course?.courseId,
          }),
        });
      } finally {
        setAdjusting(false);
      }
    }
  };

  const alertConfig = getBloodSugarAlertConfig(assessment, latestBloodSugar);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">여행 중 모니터링</h1>

      {alertConfig.bannerLevel && assessment?.action && (
        <AlertBanner
          level={alertConfig.bannerLevel}
          message={`혈당 ${latestBloodSugar} mg/dL — ${assessment.action}`}
          action={alertConfig.actionLabel ?? undefined}
          onAction={alertConfig.onAction ?? undefined}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">혈당 기록</CardTitle>
        </CardHeader>
        <CardContent>
          <BloodSugarInput
            key={inputKey}
            onSubmit={handleBloodSugar}
            loading={adjusting}
          />
          {recordedMessage && (
            <p className="mt-2 text-sm text-emerald-600">{recordedMessage}</p>
          )}
          {latestBloodSugar && !recordedMessage && (
            <p className="mt-2 text-sm text-gray-500">
              최근: {latestBloodSugar} mg/dL
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/travel/health')}
        >
          건강 기록
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/travel/nearby')}
        >
          주변 시설
        </Button>
      </div>

      <Link href="/guardian">
        <Button variant="outline" className="w-full">
          보호자 설정
        </Button>
      </Link>

      <p className="text-center text-xs text-gray-400">
        AI 분석 및 알림은 참고용이며 의료 진단이 아닙니다.
      </p>
    </div>
  );
}
