'use client';

import { useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';

/**
 * Applies the persisted store after the first client render.
 *
 * The store sets `skipHydration`, so both the server render and the first
 * client render use the defaults and therefore agree. This component then
 * reads localStorage in an effect, which runs after hydration has completed,
 * and the saved profile arrives as a normal state update instead of as a
 * mismatch React has to recover from.
 *
 * It renders nothing. Mounted once in the root layout so every route gets the
 * behaviour without each page having to remember to ask for it.
 */
export function StoreHydration() {
  useEffect(() => {
    void useFinancialStore.persist.rehydrate();
  }, []);

  return null;
}
