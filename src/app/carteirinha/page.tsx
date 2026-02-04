"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "@/lib/firebase/client";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import {
  buildCarteiraDocument,
  buildCarteiraMarkup,
  buildMemberQrPayload,
  resolveCarteiraTitle,
  resolvePhotoForCard,
  type CardMember,
  type PrintMode,
} from "@/lib/members/card";

const normalizeCpf = (value: string) => value.replace(/\D/g, "");

const formatCpf = (value: string) => {
  const normalized = normalizeCpf(value);
  if (normalized.length === 0) return "";
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6)
    return `${normalized.slice(0, 3)}.${normalized.slice(3)}`;
  if (normalized.length <= 9)
    return `${normalized.slice(0, 3)}.${normalized.slice(
      3,
      6
    )}.${normalized.slice(6)}`;
  return `${normalized.slice(0, 3)}.${normalized.slice(
    3,
    6
  )}.${normalized.slice(6, 9)}-${normalized.slice(9, 11)}`;
};

export default function CarteirinhaPage() {
  const { settings } = useSiteSettings();
  const [cpfValue, setCpfValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [member, setMember] = useState<CardMember | null>(null);
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS|Android/.test(navigator.userAgent);

  const openCard = async (memberData: CardMember) => {
    try {
      const qrPayload = buildMemberQrPayload(memberData);
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "L",
      });
      const w = window.open("", "_blank");
      if (!w) {
        setError(
          "Não foi possível abrir a carteirinha. Libere os pop-ups e tente novamente."
        );
        return;
      }
      const photoResolved = await resolvePhotoForCard(memberData.photo);
      const memberWithPhoto = photoResolved
        ? { ...memberData, photo: photoResolved }
        : memberData;
      const sheets = buildCarteiraMarkup(memberWithPhoto, qrDataUrl, settings);
      const mode: PrintMode = isSafari ? "download" : "print";
      const carteiraTitle = resolveCarteiraTitle(memberData.cargo);
      const title = memberData.name
        ? `${carteiraTitle} • ${memberData.name}`
        : carteiraTitle;
      const html = buildCarteiraDocument(sheets, {
        mode,
        filename: "carteira-membro",
        pageSelector: ".card-sheet",
        title,
      });
      w.document.open();
      w.document.write(html);
      w.document.close();
      setNotice("Carteirinha gerada. Se não abriu, clique no botão abaixo.");
    } catch (err) {
      setError("Não foi possível gerar a carteirinha agora.");
    }
  };

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setMember(null);

    if (!db) {
      setError("Firebase não configurado.");
      return;
    }

    const term = cpfValue.trim();
    if (!term) {
      setError("Informe o CPF.");
      return;
    }

    setLoading(true);
    try {
      const censusRef = collection(db, "censusMembers");
      const normalized = normalizeCpf(term);
      if (normalized.length !== 11) {
        setError("CPF inválido. Informe 11 dígitos.");
        return;
      }

      let snap = await getDocs(
        query(censusRef, where("cpfNormalized", "==", normalized), limit(1))
      );
      if (snap.empty) {
        snap = await getDocs(
          query(censusRef, where("cpf", "==", term), limit(1))
        );
      }

      if (snap.empty) {
        setError("Cadastro não encontrado. Verifique o CPF.");
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data() as CardMember;
      const found = { id: docSnap.id, ...data };
      setMember(found);
      await openCard(found);
    } catch (err) {
      setError("Não foi possível localizar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCpfChange = (value: string) => {
    setCpfValue(formatCpf(value));
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Carteirinha do membro
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                Consultar carteirinha
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Informe seu CPF para gerar a sua carteirinha.
              </p>
            </div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Voltar ao site
            </Link>
          </div>

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                CPF
              </label>
              <input
                type="text"
                value={cpfValue}
                onChange={(event) => handleCpfChange(event.target.value)}
                placeholder="000.000.000-00"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? "Buscando..." : "Gerar carteirinha"}
            </button>
          </form>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {member ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Encontramos o cadastro de{" "}
                <strong className="text-slate-900">
                  {member.name || "Membro"}
                </strong>
                .
              </p>
              <button
                type="button"
                onClick={() => openCard(member)}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition"
              >
                Gerar novamente
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
