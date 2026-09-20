import {
  getRestaurantsByLocation,
  getVeganRestaurants,
} from '@/lib/tourapi/restaurant';
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
        { error: 'lat and lng are required', restaurants: [] },
        { status: 400 }
      );
    }
    const vegan = searchParams.get('vegan') === 'true';
    const areaCode = searchParams.get('areaCode') ?? undefined;

    const restaurants = vegan
      ? await getVeganRestaurants(lat, lng, areaCode)
      : await getRestaurantsByLocation(lat, lng);

    return Response.json({ restaurants });
  } catch (error) {
    return errorResponse(error);
  }
}
