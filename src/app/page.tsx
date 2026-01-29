import HeroSection from "@/components/sections/HeroSection";
import ServiceTimesSection from "@/components/sections/ServiceTimesSection";
import DepartmentsSection from "@/components/sections/DepartmentsSection";
import NewsSection from "@/components/sections/NewsSection";
import EventsSection from "@/components/sections/EventsSection";
import MapSection from "@/components/sections/MapSection";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ServiceTimesSection />
      <DepartmentsSection />
      <NewsSection />
      <EventsSection />
      <span
        id="contribuicao"
        className="block h-0 scroll-mt-40"
        aria-hidden="true"
      ></span>
      <MapSection />
    </main>
  );
}
