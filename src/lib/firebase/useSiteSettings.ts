"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  defaultSiteSettings,
  type SiteSettings,
} from "@/data/siteContent";

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const ref = doc(db, "settings", "site");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as Partial<SiteSettings> | undefined;
        const merged = { ...defaultSiteSettings, ...(data || {}) } as Record<
          string,
          unknown
        >;
        const normalized = Object.keys(merged).reduce((acc, key) => {
          const value = merged[key];
          acc[key] = value == null ? "" : value;
          return acc;
        }, {} as Record<string, unknown>);
        setSettings(normalized as SiteSettings);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { settings, loading };
}
