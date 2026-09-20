import { getNearbyEmergencyRooms } from '@/lib/medical/emergency';
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
        { error: 'lat and lng are required', emergency: [] },
        { status: 400 }
      );
    }
    const emergency = await getNearbyEmergencyRooms(lat, lng);
    return Response.json({ emergency });
  } catch (error) {
    return errorResponse(error);
  }
}
