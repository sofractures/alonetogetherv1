"use client";

import { MemorySkyline } from "@/components/ui/MemorySkyline";
import { ExploreMenu } from "@/components/ui/ExploreMenu";
import { memoriesText } from "@/data/memories";

export default function SkylinePage() {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-black">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0"
        style={{
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      >
        <source src="/assets/video_clip_skyline.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for better contrast */}
      <div className="fixed inset-0 bg-black/30 z-[1]" style={{ pointerEvents: 'none' }} />
      
      {/* Menu in top-right corner */}
      <div className="relative z-10">
        <ExploreMenu currentPage="skyline" />
      </div>

      {/* Skyline positioned at bottom (matching landing page style) */}
      <div className="absolute bottom-0 left-0 right-0 z-[2] h-64 flex items-end overflow-x-auto overflow-y-hidden touch-pan-x">
        {/* Allow horizontal scrolling across the skyline, especially on mobile */}
        <div className="min-w-full">
          <MemorySkyline memories={memoriesText} className="w-full" />
        </div>
      </div>
    </div>
  );
}

