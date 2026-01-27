"use client";

import { useState, useCallback } from "react";
import { syncData } from "@/lib/sync";
import { supabase } from "@/lib/supabase";

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await syncData(user.id);
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isSyncing,
    lastSyncTime,
    triggerSync,
  };
}
