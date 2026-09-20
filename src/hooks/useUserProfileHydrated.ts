'use client';

import { useState, useEffect } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';

export function useUserProfileHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useUserProfileStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useUserProfileStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  return hydrated;
}
