'use client';

import { useState, useEffect } from 'react';
import { useHealthStore } from '@/store/healthStore';

export function useHealthStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useHealthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useHealthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  return hydrated;
}
