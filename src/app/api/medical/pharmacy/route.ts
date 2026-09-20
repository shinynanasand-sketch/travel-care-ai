import {
  getNearbyPharmaciesWithMeta,
} from '@/lib/medical/hospital';
import { errorResponse } from '@/lib/utils/api-error';

function parseCoord(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseCoord(searchParams.get('lat'));
    const lng = parseCoord(searchParams.get('lng'));
    if (lat == null || lng == null) {
      return Response.json(
        { error: 'lat and lng are required', pharmacies: [], meta: null },
        { status: 400 }
      );
    }
    const radius = parseInt(searchParams.get('radius') ?? '2000', 10);
    const { facilities, meta } = await getNearbyPharmaciesWithMeta(lat, lng, radius);
    return Response.json({ pharmacies: facilities, meta });
  } catch (error) {
    return errorResponse(error);
  }
}
