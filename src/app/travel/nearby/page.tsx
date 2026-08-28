'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KakaoMap } from '@/components/map/KakaoMap';
import { MedicalMarker } from '@/components/map/MedicalMarker';
import { VeganMarker } from '@/components/map/VeganMarker';
import {
  MedicalDiagnosticsBanner,
  MedicalSourceBadge,
} from '@/components/medical/MedicalDiagnosticsBanner';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUserProfileStore } from '@/store/userProfileStore';
import { isValidCoord } from '@/lib/geo/distance';
import { tourCoords } from '@/lib/tourapi/client';
import type { MedicalFacility, MedicalLookupMeta } from '@/types/medical.types';
import type { TourApiItem } from '@/types/tourapi.types';

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
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const { healthProfile } = useUserProfileStore();
  const isVegan = healthProfile?.conditions.includes('VEGAN') ?? false;
  const [hospitals, setHospitals] = useState<MedicalFacility[]>([]);
  const [pharmacies, setPharmacies] = useState<MedicalFacility[]>([]);
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
      isVegan
        ? fetch(`/api/restaurant/list?lat=${lat}&lng=${lng}&vegan=true`).then((r) =>
            r.json()
          )
        : Promise.resolve({ restaurants: [] }),
    ])
      .then(([h, p, v]) => {
        setHospitals(h.hospitals ?? []);
        setPharmacies(p.pharmacies ?? []);
        setVeganRestaurants(v.restaurants ?? []);
        setMedicalMeta(mergeMeta(h.meta, p.meta));
      })
      .catch(() => {
        setFetchError('주변 시설 정보를 불러오지 못했습니다.');
      })
      .finally(() => setFetching(false));
  }, [lat, lng, isVegan]);

  const center = { lat: lat ?? 37.5665, lng: lng ?? 126.978 };
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
      <h1 className="text-xl font-bold">주변 시설</h1>

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

      {isVegan && (
        <section className="space-y-2">
          <h2 className="font-semibold">비건 식당</h2>
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
            <p className="text-sm text-gray-500">주변 비건 식당 정보가 없습니다.</p>
          )}
        </section>
      )}

      <Link href="/travel">
        <Button variant="outline" className="w-full">
          돌아가기
        </Button>
      </Link>
    </div>
  );
}
