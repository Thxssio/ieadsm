"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { type Department } from "@/data/site";
import InfoModal from "@/components/ui/InfoModal";
import { useDepartments } from "@/lib/firebase/useDepartments";

export default function MinistriesGrid() {
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(
    null
  );
  const { items: departments } = useDepartments();
  const renderDepartmentIcon = (
    dept?: Department | null,
    size: "card" | "modal" = "card"
  ) => {
    if (!dept) return null;
    const imageClass = size === "modal" ? "w-32 h-32" : "w-24 h-24";
    const iconScale = size === "modal" ? "scale-150" : "scale-125";
    if (dept.logo) {
      return (
        <img
          src={encodeURI(dept.logo)}
          alt={dept.title}
          className={`${imageClass} object-contain`}
          loading="lazy"
        />
      );
    }
    return dept.icon ? (
      <div className={`text-blue-600 ${iconScale}`}>{dept.icon}</div>
    ) : null;
  };

  return (
    <>
      {departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 h-full flex flex-col"
            >
              <div className="flex items-center justify-center mb-6">
                {renderDepartmentIcon(dept, "card")}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-700 transition-colors">
                {dept.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                {dept.description}
              </p>
              <div className="pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveDepartment(dept)}
                  className="inline-flex items-center text-sm font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase tracking-wide"
                >
                  Saiba Mais{" "}
                  <ChevronRight className="ml-1 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center text-slate-500">
          Nenhum ministério cadastrado ainda.
        </div>
      )}

      <InfoModal
        open={Boolean(activeDepartment)}
        onClose={() => setActiveDepartment(null)}
        title={activeDepartment?.title ?? ""}
        description={activeDepartment?.description ?? ""}
        icon={renderDepartmentIcon(activeDepartment, "modal")}
      />
    </>
  );
}
