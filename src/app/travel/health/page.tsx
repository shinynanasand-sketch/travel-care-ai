'use client';

import Link from 'next/link';
import { HealthChart } from '@/components/health/HealthChart';
import { Button } from '@/components/ui/button';
import { useHealthStore } from '@/store/healthStore';
import { useHealthStoreHydrated } from '@/hooks/useHealthStoreHydrated';

export default function TravelHealthPage() {
  const hydrated = useHealthStoreHydrated();
  const records = useHealthStore((s) => s.records);
  const bloodSugarRecords = records.filter((r) => r.recordType === 'BLOOD_SUGAR');

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
            여행 중 페이지에서 혈당을 기록해 주세요
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {records.slice(0, 10).map((r) => (
          <div key={r.id} className="rounded-lg border p-3 text-sm">
            {r.recordType === 'BLOOD_SUGAR' ? '혈당' : '혈압'}: {r.value}
            {r.value2 ? `/${r.value2}` : ''} mg/dL — {r.alertLevel}
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
    </div>
  );
}
