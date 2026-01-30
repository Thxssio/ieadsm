"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

type NewsModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  date?: string;
  image?: string;
  content?: string;
  excerpt?: string;
};

const toParagraphs = (text?: string) => {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export default function NewsModal({
  open,
  onClose,
  title,
  date,
  image,
  content,
  excerpt,
}: NewsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const body = content?.trim() ? content : excerpt ?? "";
  const paragraphs = toParagraphs(body);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl animate-fade-in-up overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-600 shadow-sm hover:text-slate-900 hover:bg-white transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          {image ? (
            <div className="bg-slate-100 px-4 py-4 sm:px-6">
              <Image
                src={image}
                alt=""
                width={1400}
                height={900}
                className="w-full max-h-[45vh] object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
            </div>
          ) : null}

          <div className="p-8 pt-6">
          {date ? (
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
              {date}
            </span>
          ) : null}
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
            {title}
          </h3>
          {paragraphs.length > 0 ? (
            <div className="mt-4 space-y-4 text-slate-600 leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 mt-4">
              Conteúdo completo indisponível.
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
