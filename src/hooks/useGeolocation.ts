'use client';

import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: 37.5665, lng: 126.978, error: null, loading: false });
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
          lat: 37.5665,
          lng: 126.978,
          error: '위치 정보를 가져올 수 없습니다.',
          loading: false,
        })
    );
  }, []);

  return state;
}
