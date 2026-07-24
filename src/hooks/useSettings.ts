'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppSetting } from '@/types/database';

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from('app_settings')
        .select('*');

      if (data) {
        const map: Record<string, unknown> = {};
        data.forEach((s: AppSetting) => {
          map[s.key] = s.value;
        });
        setSettings(map);
      }

      setLoading(false);
    }

    load();
  }, []);

  return { settings, loading };
}
