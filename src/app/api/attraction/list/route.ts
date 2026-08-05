import { getAttractionsByArea } from '@/lib/tourapi/attraction';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode') ?? '1';
    const attractions = await getAttractionsByArea(areaCode);
    return Response.json({ attractions });
  } catch (error) {
    return errorResponse(error);
  }
}
