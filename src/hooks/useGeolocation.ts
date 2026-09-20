'use client';

import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

/**
 * 실제 GPS만 반환한다. 실패 시 서울 좌표로 묵시 폴백하지 않는다.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        lat: null,
        lng: null,
        error: '이 기기는 위치 정보를 지원하지 않습니다.',
        loading: false,
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        }),
      () =>
        setState({
          lat: null,
          lng: null,
          error: '위치 정보를 가져올 수 없습니다. 권한을 허용해 주세요.',
          loading: false,
        })
    );
  }, []);

  return state;
}
