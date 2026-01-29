"use client";

import {
  Award,
  BookOpen,
  Clock,
  Flame,
  Heart,
  Sun,
  Users,
} from "lucide-react";
import Carousel from "@/components/ui/Carousel";
import { useServiceTimes } from "@/lib/firebase/useServiceTimes";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

export default function ServiceTimesSection() {
  const { times } = useServiceTimes();
  const { settings } = useSiteSettings();
  const iconMap = {
    Sun,
    Flame,
    Heart,
    BookOpen,
    Award,
    Users,
    Clock,
  };

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-bold uppercase tracking-wider text-sm mb-2 block">
            {settings.scheduleEyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            {settings.scheduleTitle}
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            {settings.scheduleSubtitle}
          </p>
        </div>

        <Carousel>
          {times.map((service) => {
            const Icon =
              iconMap[service.iconName as keyof typeof iconMap] || Clock;
            const color = service.color || "bg-blue-600";
            const textColor =
              service.textColor ||
              color.replace("bg-", "text-") ||
              "text-slate-700";
            return (
            <div
              key={service.id}
              className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-slate-100/50 flex flex-col min-h-[420px]"
            >
              <div className="p-8 pb-0">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`p-3.5 rounded-xl shadow-md ${color} text-white transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight">
                      {service.day}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {service.label}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-slate-100 mx-auto w-10/12 mb-6"></div>
              <div className="px-8 pb-8 pt-0 flex-1">
                <div className="space-y-0 relative">
                  <div className="absolute left-[7px] top-2 bottom-4 w-0.5 bg-slate-100"></div>
                  {(service.times || []).map((timeString, idx) => {
                    const [time, ...rest] = timeString.split(" - ");
                    const desc = rest.join(" - ");
                    return (
                      <div
                        key={idx}
                        className="relative pl-8 py-3 group/time hover:bg-slate-50/50 rounded-r-lg transition-colors"
                      >
                        <div
                          className={`absolute left-[3px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white ${color} shadow-sm z-10 transition-all duration-300 group-hover/time:scale-125`}
                        ></div>
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 transition-transform duration-300 group-hover/time:translate-x-1">
                          <span className={`font-mono font-bold text-lg ${textColor}`}>
                            {time}
                          </span>
                          <span className="text-slate-600 font-medium leading-snug">
                            {desc || "Culto"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div
                className={`absolute bottom-0 left-0 w-full h-1 ${color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
              ></div>
            </div>
          );
          })}
        </Carousel>
      </div>
    </section>
  );
}
