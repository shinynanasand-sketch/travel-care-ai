'use client';

import { useEffect, useRef, useState } from 'react';

interface Marker {
  lat: number;
  lng: number;
  title: string;
  type?: 'medical' | 'vegan' | 'default';
}

interface KakaoMapProps {
  center: { lat: number; lng: number };
  markers?: Marker[];
  height?: string;
}

type KakaoMaps = {
  load: (cb: () => void) => void;
  LatLng: new (lat: number, lng: number) => unknown;
  LatLngBounds: new () => {
    extend: (latlng: unknown) => void;
  };
  Map: new (
    el: HTMLElement,
    opts: { center: unknown; level: number }
  ) => {
    setCenter: (c: unknown) => void;
    relayout: () => void;
    setBounds: (bounds: unknown) => void;
    setLevel: (level: number) => void;
  };
  Marker: new (opts: { position: unknown; title?: string }) => {
    setMap: (map: unknown) => void;
  };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

const SCRIPT_ID = 'kakao-maps-sdk';

function loadKakaoSdk(appKey: string): Promise<KakaoMaps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window unavailable'));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao!.maps.load(() => resolve(window.kakao!.maps));
    });
  }

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (!window.kakao?.maps) {
          reject(new Error('Kakao maps missing after script load'));
          return;
        }
        window.kakao.maps.load(() => resolve(window.kakao!.maps));
      });
      existing.addEventListener('error', () =>
        reject(new Error('Kakao script failed to load'))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error('Kakao maps SDK not available'));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps));
    };
    script.onerror = () =>
      reject(
        new Error(
          '카카오 지도 스크립트를 불러오지 못했습니다. developers.kakao.com → 해당 앱(JavaScript 키) → 플랫폼 → Web에 https://travel-care-ai.vercel.app 과 http://localhost:3000 을 등록했는지 확인하세요.'
        )
      );
    document.head.appendChild(script);
  });
}

export function KakaoMap({ center, markers = [], height = '300px' }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<{
    setCenter: (c: unknown) => void;
    relayout: () => void;
    setBounds: (bounds: unknown) => void;
    setLevel: (level: number) => void;
  } | null>(null);
  const markerObjs = useRef<Array<{ setMap: (map: unknown) => void }>>([]);
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY?.trim();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const markerKey = markers
    .map((m) => `${m.lat},${m.lng},${m.title}`)
    .join('|');

  useEffect(() => {
    if (!key || !mapRef.current) return;

    let cancelled = false;

    loadKakaoSdk(key)
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        const pos = new maps.LatLng(center.lat, center.lng);
        if (!mapInstance.current) {
          mapInstance.current = new maps.Map(mapRef.current, {
            center: pos,
            level: 4,
          });
        } else {
          mapInstance.current.setCenter(pos);
        }

        markerObjs.current.forEach((m) => m.setMap(null));
        markerObjs.current = markers.map((m) => {
          const marker = new maps.Marker({
            position: new maps.LatLng(m.lat, m.lng),
            title: m.title,
          });
          marker.setMap(mapInstance.current);
          return marker;
        });

        if (markers.length >= 2 && maps.LatLngBounds) {
          const bounds = new maps.LatLngBounds();
          markers.forEach((m) => bounds.extend(new maps.LatLng(m.lat, m.lng)));
          mapInstance.current.setBounds(bounds);
        } else if (markers.length === 1) {
          mapInstance.current.setCenter(new maps.LatLng(markers[0].lat, markers[0].lng));
          mapInstance.current.setLevel(4);
        }

        requestAnimationFrame(() => {
          mapInstance.current?.relayout();
          if (markers.length >= 2 && maps.LatLngBounds) {
            const bounds = new maps.LatLngBounds();
            markers.forEach((m) => bounds.extend(new maps.LatLng(m.lat, m.lng)));
            mapInstance.current?.setBounds(bounds);
          }
        });

        setReady(true);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(
            e.message ||
              '지도를 불러오지 못했습니다. 카카오 JavaScript 키·Web 도메인을 확인하세요.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [key, center.lat, center.lng, markerKey]); // markers captured when markerKey changes


  if (!key) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 text-sm text-gray-500"
        style={{ height }}
      >
        카카오 지도 API 키를 설정하면 지도가 표시됩니다
        <br />
        (위치: {center.lat.toFixed(4)}, {center.lng.toFixed(4)})
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg" style={{ height }}>
      <div ref={mapRef} className="h-full w-full" style={{ minHeight: height }} />
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gray-50/80 text-sm text-gray-500">
          지도 불러오는 중…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50 p-3 text-center text-sm text-amber-900">
          {error}
        </div>
      )}
    </div>
  );
}
