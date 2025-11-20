"use client";

import { MemorySkyline } from "@/components/ui/MemorySkyline";
import { ExploreMenu } from "@/components/ui/ExploreMenu";
import { memoriesText } from "@/data/memories";

export default function SkylinePage() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Menu in top-right corner */}
      <ExploreMenu currentPage="skyline" />

      {/* Skyline positioned at bottom (matching landing page style) */}
      <div className="absolute bottom-0 left-0 right-0 z-0 h-64 flex items-end overflow-hidden">
        <MemorySkyline memories={memoriesText} className="w-full" />
      </div>
    </div>
  );
}

