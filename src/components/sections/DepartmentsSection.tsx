"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { type Department } from "@/data/site";
import Carousel from "@/components/ui/Carousel";
import InfoModal from "@/components/ui/InfoModal";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { useDepartments } from "@/lib/firebase/useDepartments";

export default function DepartmentsSection() {
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(
    null
  );
  const { items: departments } = useDepartments();
  const { settings } = useSiteSettings();
  const titleLines = settings.departmentsTitle.split("\n");
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
    <section
      id="ministerios"
      className="py-16 md:py-24 bg-white relative overflow-hidden scroll-mt-40"
    >
      <div className="pointer-events-none absolute top-0 right-0 w-1/3 h-full bg-blue-50/50 skew-x-12 transform translate-x-20 hidden md:block"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 md:mb-16">
          <div className="max-w-xl">
            <span className="text-blue-600 font-bold uppercase tracking-wider text-sm flex items-center gap-2 mb-2">
              <span className="w-8 h-[2px] bg-blue-600"></span>
              {settings.departmentsEyebrow}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mt-2">
              {titleLines.map((line, index) => (
                <span key={line}>
                  {line}
                  {index < titleLines.length - 1 ? (
                    <br />
                  ) : null}
                </span>
              ))}
            </h2>
          </div>
          <Link
            href="/ministerios"
            className="hidden md:flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md mt-4 md:mt-0"
          >
            Ver todos os ministérios <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
        {departments.length > 0 ? (
          <Carousel>
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
          </Carousel>
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
        <div className="mt-8 md:hidden text-center">
          <Link
            href="/ministerios"
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Ver todos os ministérios <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
