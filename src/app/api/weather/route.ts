import { getWeather } from '@/lib/tourapi/weather';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode') ?? '1';
    const weather = await getWeather(areaCode);
    return Response.json({ weather });
  } catch (error) {
    return errorResponse(error);
  }
}
