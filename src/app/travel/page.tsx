'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BloodSugarInput } from '@/components/health/BloodSugarInput';
import { AlertBanner } from '@/components/common/AlertBanner';
import { MedicalSummaryModal } from '@/components/medical/MedicalSummaryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getBloodSugarAlertConfig } from '@/lib/ai/bloodSugarAlert';
import { requestFcmToken, subscribeForegroundMessages } from '@/lib/firebase';
import { buildMedicalSummary } from '@/lib/medical/medicalSummary';

export default function TravelPage() {
  const router = useRouter();
  const { recordBloodSugar, assessment, latestBloodSugar } = useHealthMonitor();
  const { userId, healthProfile, name } = useUserProfileStore();
  const { course } = useTravelPlanStore();
  const { lat, lng } = useGeolocation();
  const [adjusting, setAdjusting] = useState(false);
  const [recordedMessage, setRecordedMessage] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [guardianToast, setGuardianToast] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmSetupMessage, setFcmSetupMessage] = useState<string | null>(null);
  const guardianToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;
    let cancelled = false;

    const setupFcm = async () => {
      console.log(
        '%c🚨 [FCM DEBUG] /travel 페이지 FCM 초기화 시작',
        'background:#7c3aed;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;'
      );

      const result = await requestFcmToken();
      if (cancelled) return;

      if (result.token) {
        setFcmToken(result.token);
        setFcmSetupMessage('알림 권한이 허용되었습니다. 저혈당 시 기기 알림을 받을 수 있습니다.');
        console.log(
          '%c🚨 [FCM DEBUG] page.tsx — fcmToken state 저장 완료',
          'background:#15803d;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          { tokenPreview: `${result.token.slice(0, 12)}…${result.token.slice(-8)}` }
        );
      } else if (result.permission === 'denied') {
        setFcmSetupMessage('알림 권한이 거부되어 FCM 토큰을 발급하지 못했습니다.');
        console.error(
          '%c🚨 [FCM DEBUG] page.tsx — 알림 권한 거부',
          'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          result
        );
      } else if (result.error === 'missing_vapid_key') {
        setFcmSetupMessage('NEXT_PUBLIC_FIREBASE_VAPID_KEY가 설정되지 않았습니다.');
        console.error(
          '%c🚨 [FCM DEBUG] page.tsx — VAPID 키 누락',
          'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          result
        );
      } else if (result.error) {
        setFcmSetupMessage(`FCM 토큰 발급 실패: ${result.error}`);
        console.error(
          '%c🚨 [FCM DEBUG] page.tsx — 토큰 발급 실패',
          'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          result
        );
      }

      const unsubscribe = await subscribeForegroundMessages((payload) => {
        if (payload.title || payload.body) {
          setGuardianToast(true);
          if (guardianToastTimerRef.current) {
            clearTimeout(guardianToastTimerRef.current);
          }
          guardianToastTimerRef.current = setTimeout(() => {
            setGuardianToast(false);
          }, 3000);
        }
      });
      if (!cancelled) {
        unsubscribeForeground = unsubscribe;
      }
    };

    void setupFcm();

    return () => {
      cancelled = true;
      unsubscribeForeground?.();
      if (guardianToastTimerRef.current) {
        clearTimeout(guardianToastTimerRef.current);
      }
    };
  }, []);

  const showGuardianAlertToast = () => {
    setGuardianToast(true);
    if (guardianToastTimerRef.current) {
      clearTimeout(guardianToastTimerRef.current);
    }
    guardianToastTimerRef.current = setTimeout(() => {
      setGuardianToast(false);
    }, 3000);
  };

  const medicalSummary = useMemo(
    () => buildMedicalSummary(name, healthProfile, latestBloodSugar),
    [name, healthProfile, latestBloodSugar]
  );
  const isHypoglycemiaAlert =
    latestBloodSugar !== null && latestBloodSugar < 70;

  const sendHypoglycemiaNotify = async (value: number) => {
    if (value >= 70) return;

    showGuardianAlertToast();

    if (!fcmToken) {
      console.error(
        '%c🚨 [FCM DEBUG] /api/notify 호출 불가 — fcmToken 없음',
        'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
        { bloodSugar: value }
      );
      return;
    }

    console.log(
      '%c🚨 [FCM DEBUG] /api/notify 호출 시작 (DB와 독립 실행)',
      'background:#1d4ed8;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
      {
        bloodSugar: value,
        tokenPreview: `${fcmToken.slice(0, 12)}…${fcmToken.slice(-8)}`,
      }
    );

    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: fcmToken, bloodSugar: value }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (response.ok && data.sent === true) {
        console.log(
          '%c🚨 [FCM DEBUG] /api/notify ✅ 성공',
          'background:#15803d;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          { status: response.status, ...data }
        );
      } else {
        console.error(
          '%c🚨 [FCM DEBUG] /api/notify ❌ 실패 또는 스킵',
          'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
          { status: response.status, ...data }
        );
      }
    } catch (error) {
      console.error(
        '%c🚨 [FCM DEBUG] /api/notify ❌ 네트워크/파싱 예외',
        'background:#b91c1c;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px;',
        error
      );
    }
  };

  const persistHealthRecord = async (value: number, level: string) => {
    if (!healthProfile) return;

    setAdjusting(true);
    try {
      if (level !== 'NORMAL') {
        try {
          const guardians = JSON.parse(
            localStorage.getItem('guardians') ?? '[]'
          ) as { fcmToken?: string }[];
          const guardianFcmTokens = guardians
            .map((g) => g.fcmToken)
            .filter((t): t is string => Boolean(t?.trim()));

          const adjustRes = await fetch('/api/course/adjust', {
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

          if (!adjustRes.ok) {
            console.error('[travel] /api/course/adjust 실패:', await adjustRes.text());
          }
        } catch (error) {
          console.error('[travel] /api/course/adjust 예외 (데모 계속):', error);
        }
      }

      try {
        const recordRes = await fetch('/api/health/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            recordType: 'BLOOD_SUGAR',
            value,
            travelPlanId: course?.courseId,
          }),
        });

        const recordData = (await recordRes.json()) as { persisted?: boolean; dbError?: string };
        if (!recordRes.ok) {
          console.error('[travel] /api/health/record 실패:', recordData);
        } else if (recordData.persisted === false) {
          console.error('[travel] /api/health/record DB 미저장 (데모 모드):', recordData.dbError);
        }
      } catch (error) {
        console.error('[travel] /api/health/record 예외 (데모 계속):', error);
      }
    } finally {
      setAdjusting(false);
    }
  };

  const handleBloodSugar = async (value: number) => {
    const result = recordBloodSugar(value);
    setRecordedMessage(`혈당 ${value} mg/dL 기록되었습니다.`);
    setInputKey((k) => k + 1);

    // FCM 알림과 DB 저장을 완전히 독립 실행 — DB 실패/지연이 FCM을 막지 않음
    await Promise.allSettled([
      sendHypoglycemiaNotify(value),
      persistHealthRecord(value, result.level),
    ]);
  };

  const alertConfig = getBloodSugarAlertConfig(assessment, latestBloodSugar);

  return (
    <div className="space-y-6">
      {guardianToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          ✓ 등록된 보호자에게 긴급 알림을 전송했습니다.
        </div>
      )}

      <h1 className="text-xl font-bold">여행 중 모니터링</h1>

      {fcmSetupMessage && (
        <p className="text-xs text-gray-500">{fcmSetupMessage}</p>
      )}

      {alertConfig.bannerLevel && assessment?.action && (
        <AlertBanner
          level={alertConfig.bannerLevel}
          message={`혈당 ${latestBloodSugar} mg/dL — ${assessment.action}`}
          action={alertConfig.actionLabel ?? undefined}
          onAction={alertConfig.onAction ?? undefined}
          secondaryAction={
            isHypoglycemiaAlert ? '의료진에게 보여주기' : undefined
          }
          onSecondaryAction={
            isHypoglycemiaAlert ? () => setSummaryOpen(true) : undefined
          }
        />
      )}

      <MedicalSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summary={medicalSummary}
      />

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
