'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HealthChart } from '@/components/health/HealthChart';
import { Button } from '@/components/ui/button';
import { useHealthStore } from '@/store/healthStore';
import { useHealthStoreHydrated } from '@/hooks/useHealthStoreHydrated';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';

export default function TravelHealthPage() {
  const router = useRouter();
  const profileHydrated = useUserProfileHydrated();
  const healthProfile = useUserProfileStore((s) => s.healthProfile);
  const hydrated = useHealthStoreHydrated();
  const records = useHealthStore((s) => s.records);
  const bloodSugarRecords = records.filter((r) => r.recordType === 'BLOOD_SUGAR');

  if (profileHydrated && !healthProfile) {
    return (
      <div className="space-y-4 text-center">
        <p>건강 기록을 보려면 건강·식이 프로필을 먼저 등록해 주세요.</p>
        <Button onClick={() => router.push('/profile?next=/travel/health')}>
          프로필 등록
        </Button>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">건강 기록</h1>
        <p className="text-center text-sm text-gray-500">기록을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">건강 기록</h1>

      {bloodSugarRecords.length > 0 ? (
        <div className="h-[200px] w-full">
          <HealthChart />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="text-sm text-gray-500">아직 기록이 없습니다.</p>
          <Link href="/travel" className="mt-3 inline-block text-sm text-emerald-600 underline">
            여행 중 페이지에서 혈당·혈압을 기록해 주세요
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {records.slice(0, 10).map((r) => (
          <div key={r.id} className="rounded-lg border p-3 text-sm">
            {r.recordType === 'BLOOD_SUGAR' ? '혈당' : '혈압'}: {r.value}
            {r.value2 != null ? `/${r.value2}` : ''}{' '}
            {r.recordType === 'BLOOD_SUGAR' ? 'mg/dL' : 'mmHg'} — {r.alertLevel}
            <span className="ml-2 text-gray-400">
              {new Date(r.recordedAt).toLocaleString('ko-KR')}
            </span>
          </div>
        ))}
      </div>

      <Link href="/travel">
        <Button variant="outline" className="w-full">
          돌아가기
        </Button>
      </Link>

      <p className="text-center text-xs text-gray-400">
        기록·안내는 참고용이며 의료 진단·처방이 아닙니다.
      </p>
    </div>
  );
}
