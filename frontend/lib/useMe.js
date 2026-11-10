'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from './api';

// Hook: memuat profil; bila belum login, arahkan ke halaman utama.
export function useMe() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const refresh = useCallback(async () => { const m = await api('/me'); setMe(m); return m; }, []);
  useEffect(() => {
    if (!getToken()) { router.replace('/'); return; }
    refresh().catch(() => {});
  }, [router, refresh]);
  return { me, refresh };
}
