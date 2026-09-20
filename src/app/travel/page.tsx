'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BloodSugarInput } from '@/components/health/BloodSugarInput';
import { BloodPressureInput } from '@/components/health/BloodPressureInput';
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
import {
  hasDiabetes,
  hasHypertension,
} from '@/lib/profile/healthConditions';

export default function TravelPage() {
  const router = useRouter();
  const { recordBloodSugar, recordBloodPressure, assessment, latestBloodSugar } =
    useHealthMonitor();
  const { userId, healthProfile, name } = useUserProfileStore();
  const { course } = useTravelPlanStore();
  const { lat, lng } = useGeolocation();
  const showBloodSugar =
    !healthProfile ||
    hasDiabetes(healthProfile.conditions) ||
    !hasHypertension(healthProfile.conditions);
  const showBloodPressure = hasHypertension(healthProfile?.conditions);
  const [adjusting, setAdjusting] = useState(false);
  const [recordedMessage, setRecordedMessage] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [guardianToast, setGuardianToast] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmSetupMessage, setFcmSetupMessage] = useState<string | null>(null);
  const [hypoNearbyCta, setHypoNearbyCta] = useState(false);
  const guardianToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const showStatusToast = (message: string) => {
    setGuardianToast(message);
    if (guardianToastTimerRef.current) {
      clearTimeout(guardianToastTimerRef.current);
    }
    guardianToastTimerRef.current = setTimeout(() => {
      setGuardianToast(null);
    }, 4000);
  };

  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;
    let cancelled = false;

    // 권한 팝업은 보호자 등록·저혈당 시에만 — 마운트에서는 수신 구독만 시도
    const setupForeground = async () => {
      const unsubscribe = await subscribeForegroundMessages((payload) => {
        if (payload.title || payload.body) {
          showStatusToast(
            payload.body
              ? `알림 수신: ${payload.body}`
              : '기기에서 긴급 알림을 수신했습니다.'
          );
        }
      });
      if (!cancelled) {
        unsubscribeForeground = unsubscribe;
      }
    };

    void setupForeground();

    return () => {
      cancelled = true;
      unsubscribeForeground?.();
      if (guardianToastTimerRef.current) {
        clearTimeout(guardianToastTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only foreground subscribe
  }, []);

  const ensureDeviceFcmToken = async (): Promise<string | null> => {
    if (fcmToken) return fcmToken;
    const result = await requestFcmToken();
    if (result.token) {
      setFcmToken(result.token);
      setFcmSetupMessage(
        '알림 권한이 허용되었습니다. 저혈당 시 기기 알림을 받을 수 있습니다.'
      );
      return result.token;
    }
    if (result.permission === 'denied') {
      setFcmSetupMessage(
        '알림 권한이 거부되어 FCM 토큰을 발급하지 못했습니다.'
      );
    } else if (result.error === 'missing_vapid_key') {
      setFcmSetupMessage(
        'NEXT_PUBLIC_FIREBASE_VAPID_KEY가 설정되지 않았습니다.'
      );
    } else if (result.error) {
      setFcmSetupMessage(`FCM 토큰 발급 실패: ${result.error}`);
    }
    return null;
  };

  const medicalSummary = useMemo(
    () => buildMedicalSummary(name, healthProfile, latestBloodSugar),
    [name, healthProfile, latestBloodSugar]
  );
  const isHypoglycemiaAlert =
    latestBloodSugar !== null && latestBloodSugar < 70;

  const loadGuardians = () => {
    try {
      return JSON.parse(localStorage.getItem('guardians') ?? '[]') as {
        name?: string;
        phone?: string;
        fcmToken?: string;
      }[];
    } catch {
      return [];
    }
  };

  const sendHypoglycemiaNotify = async (value: number) => {
    if (value >= 70) return;

    const guardians = loadGuardians();
    const guardianTokens = guardians
      .map((g) => g.fcmToken?.trim())
      .filter((t): t is string => Boolean(t));
    const contactLines = guardians
      .filter((g) => g.name && g.phone)
      .map((g) => `${g.name} ${g.phone}`);

    let deviceToken: string | null = fcmToken;
    if (guardianTokens.length === 0) {
      deviceToken = await ensureDeviceFcmToken();
    }

    const tokensToNotify =
      guardianTokens.length > 0
        ? guardianTokens
        : deviceToken
          ? [deviceToken]
          : [];

    if (tokensToNotify.length === 0) {
      if (contactLines.length > 0) {
        showStatusToast(
          `푸시 미등록 — 보호자 연락: ${contactLines.slice(0, 2).join(', ')}`
        );
      } else {
        showStatusToast(
          '푸시·보호자 미등록 — 보호자 설정에서 연락처를 등록해 주세요.'
        );
      }
      return;
    }

    let anySent = false;
    const usedGuardianToken = guardianTokens.length > 0;

    for (const token of tokensToNotify) {
      try {
        const response = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, bloodSugar: value }),
        });
        const data = (await response.json()) as {
          sent?: boolean;
          mode?: string;
        };
        if (response.ok && data.sent === true) {
          anySent = true;
        } else {
          console.error('[travel] /api/notify 실패 또는 스킵', {
            status: response.status,
            ...data,
          });
        }
      } catch (error) {
        console.error('[travel] /api/notify 예외', error);
      }
    }

    if (anySent) {
      showStatusToast(
        usedGuardianToken
          ? '등록된 보호자 기기로 긴급 알림을 전송했습니다.'
          : '이 기기로 긴급 알림을 전송했습니다. (보호자 푸시 미등록)'
      );
    } else if (contactLines.length > 0) {
      showStatusToast(
        `푸시 전송 실패 — 보호자 연락: ${contactLines.slice(0, 2).join(', ')}`
      );
    } else {
      showStatusToast(
        '긴급 알림 전송에 실패했습니다. 알림 권한·설정을 확인해 주세요.'
      );
    }
  };

  const persistHealthRecord = async (value: number, level: string) => {
    if (!healthProfile) return;

    setAdjusting(true);
    try {
      if (level !== 'NORMAL') {
        try {
          const adjustRes = await fetch('/api/course/adjust', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: course?.courseId,
              userId,
              bloodSugar: value,
              conditions: healthProfile.conditions,
              currentLocation: lat && lng ? { lat, lng } : undefined,
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

        const recordData = (await recordRes.json()) as {
          persisted?: boolean;
          dbError?: string;
        };
        if (!recordRes.ok) {
          console.error('[travel] /api/health/record 실패:', recordData);
        } else if (recordData.persisted === false) {
          showStatusToast('서버 DB 미연결 — 기록은 이 기기에만 저장되었습니다.');
          console.error(
            '[travel] /api/health/record DB 미저장 (데모 모드):',
            recordData.dbError
          );
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
    setHypoNearbyCta(value < 70);

    // FCM 알림과 DB 저장을 완전히 독립 실행 — DB 실패/지연이 FCM을 막지 않음
    await Promise.allSettled([
      sendHypoglycemiaNotify(value),
      persistHealthRecord(value, result.level),
    ]);
  };

  const handleBloodPressure = async (systolic: number, diastolic: number) => {
    const result = recordBloodPressure(systolic, diastolic);
    setRecordedMessage(
      `혈압 ${systolic}/${diastolic} mmHg 기록되었습니다.`
    );
    setInputKey((k) => k + 1);

    try {
      const recordRes = await fetch('/api/health/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          recordType: 'BLOOD_PRESSURE',
          value: systolic,
          value2: diastolic,
          travelPlanId: course?.courseId,
        }),
      });
      const recordData = (await recordRes.json()) as {
        persisted?: boolean;
        dbError?: string;
      };
      if (recordRes.ok && recordData.persisted === false) {
        showStatusToast('서버 DB 미연결 — 기록은 이 기기에만 저장되었습니다.');
      }
      if (result.level === 'DANGER') {
        showStatusToast(
          '혈압이 위험 구간입니다. 필요 시 119·의료기관에 문의하세요. (참고용)'
        );
      }
    } catch (error) {
      console.error('[travel] 혈압 기록 예외:', error);
    }
  };

  const alertConfig = getBloodSugarAlertConfig(assessment, latestBloodSugar);

  if (!healthProfile) {
    return (
      <div className="space-y-4 text-center">
        <p>건강 모니터링을 위해 건강·식이 프로필을 먼저 등록해 주세요.</p>
        <Button onClick={() => router.push('/profile?next=/travel')}>
          프로필 등록
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guardianToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
        >
          {guardianToast}
        </div>
      )}

      <h1 className="text-xl font-bold">여행 중 모니터링</h1>

      {!course && (
        <div
          role="status"
          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-sm text-teal-900"
        >
          <p>아직 생성된 여행 코스가 없습니다. 모니터링은 가능합니다.</p>
          <Button
            variant="outline"
            className="mt-2 w-full border-teal-300"
            onClick={() => router.push('/plan')}
          >
            여행 코스 만들기
          </Button>
        </div>
      )}

      {course && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              진행 중 코스 · {course.days.length}일
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              안전 점수 {course.overallSafetyScore}점
              {course.hasVeganOptions ? ' · 비건·채식 옵션' : ''}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/plan/result')}
            >
              코스 다시 보기
            </Button>
          </CardContent>
        </Card>
      )}

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

      {(hypoNearbyCta || isHypoglycemiaAlert) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium text-red-900">
              저혈당 주의 — 일정을 바꾸기보다 가까운 약국·병원에서 당 보충과
              도움을 받으세요. (참고용 안내)
            </p>
            <Button
              className="w-full"
              onClick={() => router.push('/travel/nearby')}
            >
              주변 약국·병원 보기
            </Button>
          </CardContent>
        </Card>
      )}

      <MedicalSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summary={medicalSummary}
      />

      {showBloodSugar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">혈당 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <BloodSugarInput
              key={`bs-${inputKey}`}
              onSubmit={handleBloodSugar}
              loading={adjusting}
            />
            {recordedMessage && recordedMessage.includes('혈당') && (
              <p className="mt-2 text-sm text-emerald-600">{recordedMessage}</p>
            )}
            {latestBloodSugar && !recordedMessage && (
              <p className="mt-2 text-sm text-gray-500">
                최근: {latestBloodSugar} mg/dL
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showBloodPressure && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">혈압 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <BloodPressureInput
              key={`bp-${inputKey}`}
              onSubmit={handleBloodPressure}
              loading={adjusting}
            />
            {recordedMessage && recordedMessage.includes('혈압') && (
              <p className="mt-2 text-sm text-emerald-600">{recordedMessage}</p>
            )}
          </CardContent>
        </Card>
      )}

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
        AI 분석 및 알림은 참고용이며 의료 진단·처방이 아닙니다.
      </p>
    </div>
  );
}
