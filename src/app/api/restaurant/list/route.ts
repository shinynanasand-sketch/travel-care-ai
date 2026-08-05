import {
  getRestaurantsByLocation,
  getVeganRestaurants,
} from '@/lib/tourapi/restaurant';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') ?? '37.5665');
    const lng = parseFloat(searchParams.get('lng') ?? '126.978');
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
