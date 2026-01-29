import PresidentMessageSection from "@/components/sections/institutional/PresidentMessageSection";
import HistoryTimelineSection from "@/components/sections/institutional/HistoryTimelineSection";
import BoardSection from "@/components/sections/institutional/BoardSection";

export default function InstitutionalPage() {
  return (
    <main className="pb-24 bg-white animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PresidentMessageSection />
        <HistoryTimelineSection />
        <BoardSection />
      </div>
    </main>
  );
}
