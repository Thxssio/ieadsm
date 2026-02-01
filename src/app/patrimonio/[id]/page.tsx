"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const DEFAULT_PHOTO = "/logo.png";

type PatrimonyDoc = {
  id: string;
  name: string;
  acquiredAt?: string;
  description?: string;
  department?: string;
  congregation?: string;
  sector?: string;
  photos?: string[];
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const formatMonthYear = (value?: string) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
};

export default function PatrimonioDetailPage() {
  const params = useParams<{ id: string }>();
  const assetId = params?.id;
  const [item, setItem] = useState<PatrimonyDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firestore = db;
    if (!firestore || !assetId) {
      setLoading(false);
      return;
    }
    const run = async () => {
      try {
        const snap = await getDoc(doc(firestore, "patrimony", assetId));
        if (snap.exists()) {
          setItem({ id: snap.id, ...(snap.data() as Omit<PatrimonyDoc, "id">) });
        } else {
          setItem(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [assetId]);

  const cover = useMemo(() => {
    return safePhoto(item?.photos?.[0]) || DEFAULT_PHOTO;
  }, [item]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50" />;
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Patrimônio não encontrado
          </h1>
          <p className="text-slate-500 mt-2">
            O item informado não está disponível ou foi removido.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="relative w-full h-56 bg-slate-100">
            <Image
              src={cover}
              alt={item.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="p-8 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Patrimônio
              </p>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">
                {item.name}
              </h1>
              <p className="text-sm text-slate-500 mt-1">ID: {item.id}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
              {item.department ? (
                <div>
                  <span className="font-semibold text-slate-700">Departamento:</span>{" "}
                  {item.department}
                </div>
              ) : null}
              {item.congregation ? (
                <div>
                  <span className="font-semibold text-slate-700">Congregação:</span>{" "}
                  {item.congregation}
                </div>
              ) : null}
              {item.sector ? (
                <div>
                  <span className="font-semibold text-slate-700">Setor:</span> {item.sector}
                </div>
              ) : null}
              {item.acquiredAt ? (
                <div>
                  <span className="font-semibold text-slate-700">Aquisição:</span>{" "}
                  {formatMonthYear(item.acquiredAt)}
                </div>
              ) : null}
            </div>

            {item.description ? (
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-slate-700">Descrição:</span>{" "}
                {item.description}
              </div>
            ) : null}

            {item.photos && item.photos.length > 1 ? (
              <div>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Fotos
                </h2>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {item.photos.map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="relative w-full pt-[75%] rounded-2xl overflow-hidden border border-slate-200"
                    >
                      <Image
                        src={safePhoto(photo) || DEFAULT_PHOTO}
                        alt={item.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
