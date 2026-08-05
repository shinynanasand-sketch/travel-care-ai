'use client';

import { useQuery } from '@tanstack/react-query';

export function useTourAPI(
  endpoint: string,
  params?: Record<string, string>
) {
  const search = params
    ? '?' + new URLSearchParams(params).toString()
    : '';

  return useQuery({
    queryKey: ['tourapi', endpoint, params],
    queryFn: async () => {
      const res = await fetch(`/api/${endpoint}${search}`);
      if (!res.ok) throw new Error('API 요청 실패');
      return res.json();
    },
    enabled: !!endpoint,
  });
}
