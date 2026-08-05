'use client';

import { useEffect, useRef } from 'react';

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

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => {
          setCenter: (c: unknown) => void;
        };
        Marker: new (opts: { position: unknown; title?: string }) => {
          setMap: (map: unknown) => void;
        };
      };
    };
  }
}

export function KakaoMap({ center, markers = [], height = '300px' }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;
      window.kakao.maps.load(() => {
        const pos = new window.kakao.maps.LatLng(center.lat, center.lng);
        const map = new window.kakao.maps.Map(mapRef.current!, {
          center: pos,
          level: 4,
        });
        markers.forEach((m) => {
          const marker = new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(m.lat, m.lng),
            title: m.title,
          });
          marker.setMap(map);
        });
      });
    };

    if (window.kakao?.maps) {
      initMap();
      return;
    }

    if (!key) return;

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [center.lat, center.lng, markers, key]);

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

  return <div ref={mapRef} className="w-full rounded-lg" style={{ height }} />;
}
