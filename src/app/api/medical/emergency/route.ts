import { getNearbyEmergencyRooms } from '@/lib/medical/emergency';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') ?? '37.5665');
    const lng = parseFloat(searchParams.get('lng') ?? '126.978');
    const emergency = await getNearbyEmergencyRooms(lat, lng);
    return Response.json({ emergency });
  } catch (error) {
    return errorResponse(error);
  }
}
