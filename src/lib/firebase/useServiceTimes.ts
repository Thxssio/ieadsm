"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { serviceTimes as defaultTimes, type ServiceTime } from "@/data/site";

type ServiceTimeDoc = Omit<ServiceTime, "id"> & { order?: number };

export function useServiceTimes() {
  const [times, setTimes] = useState<ServiceTime[]>(defaultTimes);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "serviceTimes"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc, index) => ({
          id: index + 1,
          ...(doc.data() as ServiceTimeDoc),
        }));
        setTimes(docs.length ? docs : defaultTimes);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { times, loading };
}
