'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KakaoMap } from '@/components/map/KakaoMap';
import { MedicalMarker } from '@/components/map/MedicalMarker';
import { VeganMarker } from '@/components/map/VeganMarker';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useUserProfileStore } from '@/store/userProfileStore';
import type { MedicalFacility } from '@/types/medical.types';
import type { TourApiItem } from '@/types/tourapi.types';

export default function TravelNearbyPage() {
  const { lat, lng, loading: geoLoading } = useGeolocation();
  const { healthProfile } = useUserProfileStore();
  const isVegan = healthProfile?.conditions.includes('VEGAN') ?? false;
  const [hospitals, setHospitals] = useState<MedicalFacility[]>([]);
  const [pharmacies, setPharmacies] = useState<MedicalFacility[]>([]);
  const [veganRestaurants, setVeganRestaurants] = useState<TourApiItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;

    setFetching(true);
    setFetchError(null);

    Promise.all([
      fetch(`/api/medical/hospital?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      fetch(`/api/medical/pharmacy?lat=${lat}&lng=${lng}&radius=500`).then((r) => r.json()),
      isVegan
        ? fetch(`/api/restaurant/list?lat=${lat}&lng=${lng}&vegan=true`).then((r) => r.json())
        : Promise.resolve({ restaurants: [] }),
    ])
      .then(([h, p, v]) => {
        setHospitals(h.hospitals ?? []);
        setPharmacies(p.pharmacies ?? []);
        setVeganRestaurants(v.restaurants ?? []);
      })
      .catch(() => {
        setFetchError('주변 시설 정보를 불러오지 못했습니다.');
      })
      .finally(() => setFetching(false));
  }, [lat, lng, isVegan]);

  const center = { lat: lat ?? 37.5665, lng: lng ?? 126.978 };
  const markers = [
    ...hospitals.map((h) => ({
      lat: h.coordinates.lat,
      lng: h.coordinates.lng,
      title: h.name,
      type: 'medical' as const,
    })),
    ...pharmacies.map((p) => ({
      lat: p.coordinates.lat,
      lng: p.coordinates.lng,
      title: p.name,
      type: 'medical' as const,
    })),
    ...veganRestaurants.map((r) => ({
      lat: parseFloat(r.mapy) / 10000000,
      lng: parseFloat(r.mapx) / 10000000,
      title: r.title,
      type: 'vegan' as const,
    })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">주변 시설</h1>

      <KakaoMap center={center} markers={markers} height="250px" />

      {(geoLoading || fetching) && (
        <p className="text-center text-sm text-gray-500">주변 시설 정보를 불러오는 중...</p>
      )}

      {fetchError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {fetchError}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">병원</h2>
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
        <h2 className="font-semibold">약국 (500m)</h2>
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
            veganRestaurants.slice(0, 5).map((r) => (
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
