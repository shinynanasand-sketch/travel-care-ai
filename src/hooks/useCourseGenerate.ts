'use client';

import { useMutation } from '@tanstack/react-query';
import type { GenerateCourseRequest, GenerateCourseResponse } from '@/types/course.types';

export function useCourseGenerate() {
  return useMutation({
    mutationFn: async (request: GenerateCourseRequest) => {
      const res = await fetch('/api/course/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error('코스 생성에 실패했습니다.');
      return res.json() as Promise<GenerateCourseResponse>;
    },
  });
}
