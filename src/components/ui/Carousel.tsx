"use client";

import { Children, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
};

export default function Carousel({
  children,
  className = "",
  itemClassName = "w-[300px] sm:w-[340px] lg:w-[380px]",
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByAmount = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.85, 280);
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <div
        ref={trackRef}
        className="flex gap-6 overflow-x-auto scroll-smooth pb-6 px-4"
      >
        {Children.map(children, (child) => (
          <div className={`shrink-0 ${itemClassName}`}>{child}</div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByAmount(-1)}
        className="hidden lg:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-slate-100 text-slate-500 hover:text-blue-600 hover:border-blue-100"
        aria-label="Voltar"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => scrollByAmount(1)}
        className="hidden lg:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-md border border-slate-100 text-slate-500 hover:text-blue-600 hover:border-blue-100"
        aria-label="Avançar"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
