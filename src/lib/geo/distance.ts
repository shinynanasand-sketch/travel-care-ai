/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

export function formatDistanceM(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** Rough walk time from straight-line distance (~4.5 km/h). */
export function estimateWalkMinutes(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return Math.max(1, Math.round(meters / 75));
}

/** Rough urban drive time (~25 km/h). */
export function estimateDriveMinutes(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return Math.max(1, Math.round(meters / 420));
}

/**
 * Travel hint by distance — do not suggest long walks for chronic-care travelers.
 * ≤1.2km: walk · ≤4km: car/transit · farther: vehicle/transit recommended
 */
export function formatTravelHint(meters: number): string {
  const dist = formatDistanceM(meters);
  if (!Number.isFinite(meters) || meters <= 0) {
    return `다음까지 직선 약 ${dist}`;
  }
  if (meters <= 1200) {
    return `다음까지 직선 약 ${dist} · 도보 약 ${estimateWalkMinutes(meters)}분(추정)`;
  }
  if (meters <= 4000) {
    return `다음까지 직선 약 ${dist} · 차로 약 ${estimateDriveMinutes(meters)}분 · 대중교통 가능(추정)`;
  }
  return `다음까지 직선 약 ${dist} · 차량·대중교통 권장 · 차로 약 ${estimateDriveMinutes(meters)}분(추정)`;
}

export function isValidCoord(c?: { lat: number; lng: number } | null): boolean {
  if (!c) return false;
  return (
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    !(c.lat === 0 && c.lng === 0)
  );
}
