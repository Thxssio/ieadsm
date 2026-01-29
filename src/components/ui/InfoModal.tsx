"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type InfoModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
};

export default function InfoModal({
  open,
  onClose,
  title,
  description,
  icon,
}: InfoModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl animate-fade-in-up"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          {icon ? (
            <div className="mb-6 flex items-center justify-center">
              {icon}
            </div>
          ) : null}
          <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
          <p className="text-slate-600 leading-relaxed mt-4">{description}</p>
        </div>
      </div>
    </div>
  );
}
