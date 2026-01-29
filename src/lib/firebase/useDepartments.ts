"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { departments as defaultDepartments, type Department } from "@/data/site";

type DepartmentDoc = Omit<Department, "id"> & { order?: number };

export function useDepartments() {
  const [items, setItems] = useState<Department[]>(defaultDepartments);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "departments"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as DepartmentDoc),
        }));
        setItems(docs.length ? docs : defaultDepartments);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { items, loading };
}
