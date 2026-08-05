import { getAccessibilityInfo } from '@/lib/tourapi/accessibility';
import { errorResponse } from '@/lib/utils/api-error';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    if (!contentId) {
      return Response.json({ error: 'contentId required' }, { status: 400 });
    }
    const accessibility = await getAccessibilityInfo(contentId);
    return Response.json({ accessibility });
  } catch (error) {
    return errorResponse(error);
  }
}
