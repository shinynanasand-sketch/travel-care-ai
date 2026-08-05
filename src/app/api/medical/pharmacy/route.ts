import { getNearbyPharmacies } from '@/lib/medical/hospital';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') ?? '37.5665');
    const lng = parseFloat(searchParams.get('lng') ?? '126.978');
    const radius = parseInt(searchParams.get('radius') ?? '2000', 10);
    const pharmacies = await getNearbyPharmacies(lat, lng, radius);
    return Response.json({ pharmacies });
  } catch (error) {
    return errorResponse(error);
  }
}
