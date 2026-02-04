"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type AdminHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
};

export function AdminHeader({
  title,
  subtitle,
  icon,
  right,
}: AdminHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-slate-50/95 border-b border-slate-200 sticky top-0 z-10 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => router.push("/admin")}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 truncate">
              {icon ? (
                <span className="text-indigo-600 flex items-center">
                  {icon}
                </span>
              ) : null}
              <span className="truncate">{title}</span>
            </h1>
            {subtitle ? (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {right ? (
          <div className="text-sm text-slate-500 hidden sm:flex items-center gap-3">
            {right}
          </div>
        ) : null}
      </div>
    </header>
  );
}
