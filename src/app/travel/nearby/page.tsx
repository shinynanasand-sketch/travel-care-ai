'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KakaoMap } from '@/components/map/KakaoMap';
import { MedicalMarker } from '@/components/map/MedicalMarker';
import { VeganMarker } from '@/components/map/VeganMarker';
import {
  MedicalDiagnosticsBanner,
  MedicalSourceBadge,
} from '@/components/medical/MedicalDiagnosticsBanner';
import { MedicalSummaryModal } from '@/components/medical/MedicalSummaryModal';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { useUserProfileStore } from '@/store/userProfileStore';
import { buildMedicalSummary } from '@/lib/medical/medicalSummary';
import { isValidCoord } from '@/lib/geo/distance';
import { tourCoords } from '@/lib/tourapi/client';
import { wantsPlantBasedDining, hasHealthOrDietConditions } from '@/lib/profile/healthConditions';
import type { MedicalFacility, MedicalLookupMeta } from '@/types/medical.types';
import type { TourApiItem } from '@/types/tourapi.types';
import { useRouter } from 'next/navigation';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';

function mergeMeta(
  a?: MedicalLookupMeta,
  b?: MedicalLookupMeta
): MedicalLookupMeta | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;
  return {
    source:
      a.source === 'hira' || b.source === 'hira'
        ? a.hiraFailed && b.hiraFailed
          ? a.source === 'kakao' || b.source === 'kakao'
            ? 'kakao'
            : a.source
          : 'hira'
        : a.source === 'kakao' || b.source === 'kakao'
          ? 'kakao'
          : a.source,
    hiraFailed: a.hiraFailed || b.hiraFailed,
    hiraMessage: [a.hiraMessage, b.hiraMessage].filter(Boolean).join(' | '),
  };
}

export default function TravelNearbyPage() {
  const router = useRouter();
  const hydrated = useUserProfileHydrated();
  const { lat, lng, loading: geoLoading, error: geoError } = useGeolocation();
  const { healthProfile, name } = useUserProfileStore();
  const { latestBloodSugar } = useHealthMonitor();
  const plantBased = wantsPlantBasedDining(healthProfile?.conditions);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [hospitals, setHospitals] = useState<MedicalFacility[]>([]);
  const [pharmacies, setPharmacies] = useState<MedicalFacility[]>([]);
  const [emergencies, setEmergencies] = useState<MedicalFacility[]>([]);
  const [veganRestaurants, setVeganRestaurants] = useState<TourApiItem[]>([]);
  const [medicalMeta, setMedicalMeta] = useState<MedicalLookupMeta | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    setFetching(true);
    setFetchError(null);

    Promise.all([
      fetch(`/api/medical/hospital?lat=${lat}&lng=${lng}&radius=3000`).then((r) =>
        r.json()
      ),
      fetch(`/api/medical/pharmacy?lat=${lat}&lng=${lng}&radius=2000`).then((r) =>
        r.json()
      ),
      fetch(`/api/medical/emergency?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      plantBased
        ? fetch(`/api/restaurant/list?lat=${lat}&lng=${lng}&vegan=true`).then((r) =>
            r.json()
          )
        : Promise.resolve({ restaurants: [] }),
    ])
      .then(([h, p, e, v]) => {
        setHospitals(h.hospitals ?? []);
        setPharmacies(p.pharmacies ?? []);
        setEmergencies(e.emergency ?? []);
        setVeganRestaurants(v.restaurants ?? []);
        setMedicalMeta(mergeMeta(h.meta, p.meta));
      })
      .catch(() => {
        setFetchError('주변 시설 정보를 불러오지 못했습니다.');
      })
      .finally(() => setFetching(false));
  }, [lat, lng, plantBased]);

  const medicalSummary = useMemo(
    () => buildMedicalSummary(name, healthProfile, latestBloodSugar),
    [name, healthProfile, latestBloodSugar]
  );

  if (hydrated && !hasHealthOrDietConditions(healthProfile?.conditions)) {
    return (
      <div className="space-y-4 text-center">
        <p>주변 시설 안내를 위해 질환·식이 조건을 하나 이상 선택해 주세요.</p>
        <Button onClick={() => router.push('/profile?next=/travel/nearby')}>
          프로필 등록
        </Button>
      </div>
    );
  }

  if (geoLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">주변 시설</h1>
        <p className="text-center text-sm text-gray-500">위치를 확인하는 중...</p>
      </div>
    );
  }

  if (!lat || !lng) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">주변 시설</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {geoError ??
            '현재 위치를 확인할 수 없습니다. 브라우저 위치 권한을 허용한 뒤 다시 시도해 주세요.'}
        </p>
        <p className="text-xs text-gray-500">
          잘못된 도시(예: 서울)의 시설을 보여 주지 않도록, 위치가 없으면 조회하지
          않습니다.
        </p>
        <Link href="/travel">
          <Button variant="outline" className="w-full">
            돌아가기
          </Button>
        </Link>
        <p className="text-center text-xs text-gray-400">
          안내 정보는 참고용이며 의료 진단·처방이 아닙니다.
        </p>
      </div>
    );
  }

  const center = { lat, lng };
  const markers = [
    ...hospitals
      .filter((h) => isValidCoord(h.coordinates))
      .map((h) => ({
        lat: h.coordinates.lat,
        lng: h.coordinates.lng,
        title: h.name,
        type: 'medical' as const,
      })),
    ...pharmacies
      .filter((p) => isValidCoord(p.coordinates))
      .map((p) => ({
        lat: p.coordinates.lat,
        lng: p.coordinates.lng,
        title: p.name,
        type: 'medical' as const,
      })),
    ...emergencies
      .filter((e) => isValidCoord(e.coordinates))
      .map((e) => ({
        lat: e.coordinates.lat,
        lng: e.coordinates.lng,
        title: e.name,
        type: 'medical' as const,
      })),
    ...veganRestaurants.flatMap((r) => {
      const c = tourCoords(r.mapx, r.mapy);
      if (!isValidCoord(c)) return [];
      // Drop far outliers so the map stays usable near the user
      const dist = r.dist ? parseInt(r.dist, 10) : NaN;
      if (Number.isFinite(dist) && dist > 8000) return [];
      return [
        {
          lat: c.lat,
          lng: c.lng,
          title: r.title,
          type: 'vegan' as const,
        },
      ];
    }),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold">주변 시설</h1>
        <Button
          variant={medicalSummary.isCrisis ? 'danger' : 'default'}
          size="lg"
          className="w-full text-base font-bold"
          onClick={() => setSummaryOpen(true)}
        >
          🏥 의료진에게 내 상태 보여주기
        </Button>
      </div>

      <MedicalSummaryModal
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        summary={medicalSummary}
      />

      <KakaoMap center={center} markers={markers} height="250px" />

      <MedicalDiagnosticsBanner meta={medicalMeta} label="주변 의료(GPS)" />

      {(geoLoading || fetching) && (
        <p className="text-center text-sm text-gray-500">주변 시설 정보를 불러오는 중...</p>
      )}

      {fetchError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fetchError}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">
          병원
          <MedicalSourceBadge source={hospitals[0]?.source} />
        </h2>
        {hospitals.length > 0 ? (
          hospitals.slice(0, 3).map((h, i) => (
            <MedicalMarker
              key={`${h.name}-${i}`}
              name={h.name}
              type="HOSPITAL"
              distanceM={h.distanceM}
              address={h.address}
              phone={h.phone}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">주변 병원 정보가 없습니다.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">
          약국 (2km)
          <MedicalSourceBadge source={pharmacies[0]?.source} />
        </h2>
        {pharmacies.length > 0 ? (
          pharmacies.slice(0, 3).map((p, i) => (
            <MedicalMarker
              key={`${p.name}-${i}`}
              name={p.name}
              type="PHARMACY"
              distanceM={p.distanceM}
              address={p.address}
              phone={p.phone}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">
            {fetching ? '불러오는 중...' : '주변 약국 정보가 없습니다.'}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">응급·응급실</h2>
        {emergencies.length > 0 ? (
          emergencies.slice(0, 3).map((e, i) => (
            <MedicalMarker
              key={`${e.name}-${i}`}
              name={e.name}
              type="HOSPITAL"
              distanceM={e.distanceM}
              address={e.address}
              phone={e.phone}
            />
          ))
        ) : (
          <p className="text-sm text-gray-500">
            {fetching ? '불러오는 중...' : '주변 응급 시설 정보가 없습니다.'}
          </p>
        )}
      </section>

      {plantBased && (
        <section className="space-y-2">
          <h2 className="font-semibold">비건·채식 식당</h2>
          {veganRestaurants.length > 0 ? (
            veganRestaurants
              .filter((r) => {
                const dist = r.dist ? parseInt(r.dist, 10) : 0;
                return !Number.isFinite(dist) || dist <= 8000;
              })
              .slice(0, 5)
              .map((r) => (
                <VeganMarker
                  key={r.contentid}
                  name={r.title}
                  distanceM={r.dist ? parseInt(r.dist, 10) : undefined}
                />
              ))
          ) : (
            <p className="text-sm text-gray-500">주변 비건·채식 식당 정보가 없습니다.</p>
          )}
        </section>
      )}

      <Link href="/travel">
        <Button variant="outline" className="w-full">
          돌아가기
        </Button>
      </Link>

      <p className="text-center text-xs text-gray-400">
        안내 정보는 참고용이며 의료 진단·처방이 아닙니다.
      </p>
    </div>
  );
}
