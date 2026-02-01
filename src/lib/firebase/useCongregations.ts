"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type Congregation = {
  id: string;
  sector: string;
  sectorOrder?: number;
  name: string;
  description?: string;
  leaders?: string;
  cep?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  supervision?: string;
  services?: string;
  photo?: string;
  order?: number;
};

type CongregationDoc = Omit<Congregation, "id">;

export function useCongregations() {
  const [items, setItems] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "congregations"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as CongregationDoc),
        }));
        setItems(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { items, loading };
}
