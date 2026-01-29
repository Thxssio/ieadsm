"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { boardMembers as defaultMembers, type BoardMember } from "@/data/site";

type BoardMemberDoc = Omit<BoardMember, "id"> & { order?: number };

export function useBoardMembers() {
  const [items, setItems] = useState<BoardMember[]>(defaultMembers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "boardMembers"), orderBy("order"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as BoardMemberDoc),
        }));
        setItems(docs.length ? docs : defaultMembers);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return { items, loading };
}
