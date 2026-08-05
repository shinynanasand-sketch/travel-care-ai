import { analyzeMenuForHealth } from '@/lib/ai/menuAnalyzer';
import { errorResponse } from '@/lib/utils/api-error';
import type { ConditionType } from '@/types/health.types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      firstmenu: string;
      treatmenu: string;
      conditions: ConditionType[];
    };

    const analysis = await analyzeMenuForHealth(body);
    return Response.json({ analysis });
  } catch (error) {
    return errorResponse(error);
  }
}
