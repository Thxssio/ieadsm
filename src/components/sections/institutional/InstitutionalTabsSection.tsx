"use client";

import { useMemo, useState } from "react";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import BoardSection from "@/components/sections/institutional/BoardSection";
import HistoryTimelineSection from "@/components/sections/institutional/HistoryTimelineSection";
import PresidentMessageSection from "@/components/sections/institutional/PresidentMessageSection";
import PresidencyAdvisorySection from "@/components/sections/institutional/PresidencyAdvisorySection";
import SectorsSection from "@/components/sections/institutional/SectorsSection";

type TabItem = {
  id: string;
  label: string;
  content: JSX.Element;
};

export default function InstitutionalTabsSection() {
  const { settings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState("president");

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        id: "president",
        label: settings.institutionalPresidentTitle || "Palavra do Presidente",
        content: <PresidentMessageSection />,
      },
      {
        id: "history",
        label: settings.institutionalHistoryTitle || "Nossa História",
        content: <HistoryTimelineSection />,
      },
      {
        id: "board",
        label: settings.institutionalBoardTitle || "Diretoria",
        content: <BoardSection />,
      },
      {
        id: "advisory",
        label:
          settings.institutionalAdvisoryTitle || "Assessorias da Presidência",
        content: <PresidencyAdvisorySection />,
      },
      {
        id: "sectors",
        label: settings.institutionalSectorsTitle || "Setores e Congregações",
        content: <SectorsSection />,
      },
    ],
    [settings]
  );

  const activeContent =
    tabs.find((tab) => tab.id === activeTab)?.content ?? tabs[0]?.content;

  return (
    <section className="pt-6">
      <div className="bg-white border border-slate-100 rounded-3xl p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">{activeContent}</div>
    </section>
  );
}
