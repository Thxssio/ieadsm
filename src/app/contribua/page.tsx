"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, QrCode } from "lucide-react";
import { generatePixPayload, generatePixQrDataUrl } from "@/lib/pix";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

const FALLBACK_PIX_KEY = "95629689/0001-24";
const PIX_NAME = "IEADSM";
const PIX_CITY = "SANTA MARIA";
const PIX_TXID = "DOADOPELOSITE";

const formatAmount = (value: string) => {
  if (!value) return "";
  const normalized = value.replace(",", ".");
  const number = Number.parseFloat(normalized);
  if (!Number.isFinite(number) || number <= 0) return "";
  return number.toFixed(2);
};

export default function ContribuaPage() {
  const { settings } = useSiteSettings();
  const pixKey = (settings.pixKey || "").trim() || FALLBACK_PIX_KEY;
  const [amountInput, setAmountInput] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [payload, setPayload] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);

  const amount = useMemo(() => formatAmount(amountInput), [amountInput]);

  const buildPayload = () =>
    generatePixPayload({
      pixKey,
      amount: amount ? Number(amount) : null,
      name: PIX_NAME,
      city: PIX_CITY,
      txid: PIX_TXID,
    });

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyPayload = async () => {
    const pixPayload = payload || buildPayload();
    await navigator.clipboard.writeText(pixPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  useEffect(() => {
    let active = true;
    const generate = async () => {
      try {
        setLoadingQr(true);
        const pixPayload = buildPayload();
        if (!active) return;
        setPayload(pixPayload);
        const dataUrl = await generatePixQrDataUrl(pixPayload);
        if (!active) return;
        setQrDataUrl(dataUrl);
      } finally {
        if (active) {
          setLoadingQr(false);
        }
      }
    };
    void generate();
    return () => {
      active = false;
    };
  }, [amountInput, pixKey]);

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-10 pb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Contribua
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900">
            Doe via PIX
          </h1>
          <p className="mt-3 text-slate-600 text-lg max-w-2xl">
            Use a chave PIX da igreja para contribuir. Você pode copiar a chave,
            gerar o QR Code ou copiar o código PIX.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Chave PIX
                </label>
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="text"
                    value={pixKey}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    <Copy className="w-4 h-4" />
                    {copiedKey ? "Copiado!" : "Copiar chave"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Valor (opcional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex.: 50,00"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Deixe em branco para escolher o valor no app do banco.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Copy className="w-4 h-4" />
                  {copiedPayload ? "Código copiado" : "Pix Copia e cola"}
                </button>
              </div>

              {payload ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 break-all">
                  {payload}
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center">
            {qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt="QR Code PIX"
                  className="w-52 h-52"
                />
                <p className="text-sm text-slate-500 mt-4">
                  Escaneie o QR Code com o app do seu banco.
                </p>
              </>
            ) : (
              <>
                <div className="w-52 h-52 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                  <QrCode className="w-10 h-10" />
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  {loadingQr ? "Gerando QR Code..." : "QR Code indisponível."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
