'use client';

import { useMutation } from '@tanstack/react-query';
import type { GenerateCourseRequest, GenerateCourseResponse } from '@/types/course.types';

const GENERATE_TIMEOUT_MS = 90_000;

export function useCourseGenerate() {
  return useMutation({
    mutationFn: async (request: GenerateCourseRequest) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

      try {
        const res = await fetch('/api/course/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!res.ok) {
          let message = '코스 생성에 실패했습니다.';
          if (res.status === 504) {
            message =
              '서버 응답 시간이 초과되었습니다. 일수를 줄이거나 잠시 후 다시 시도해 주세요.';
          } else {
            try {
              const body = (await res.json()) as { error?: string };
              if (body.error) message = body.error;
            } catch {
              /* ignore JSON parse failure */
            }
          }
          throw new Error(message);
        }

        return res.json() as Promise<GenerateCourseResponse>;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error(
            '코스 생성 시간이 초과되었습니다. 일수를 줄이거나 잠시 후 다시 시도해 주세요.'
          );
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
}
