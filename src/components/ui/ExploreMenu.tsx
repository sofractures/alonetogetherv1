"use client";

import { useRouter } from "next/navigation";

interface ExploreMenuProps {
  currentPage?: "explore" | "skyline";
}

export function ExploreMenu({ currentPage = "explore" }: ExploreMenuProps) {
  const router = useRouter();

  return (
    <div className="absolute top-0 right-0 z-20 p-4 md:p-6">
      <div className="flex gap-2">
        {currentPage === "explore" ? (
          <>
            <button
              onClick={() => router.push("/skyline")}
              className="px-4 py-2 rounded border border-white/20 bg-black/80 backdrop-blur-xl text-white hover:bg-white/10 transition-colors text-sm font-sans"
            >
              Skyline
            </button>
            {/* Listen button - can be used for future functionality */}
            <button
              onClick={() => {
                // Future: Could open a playlist or audio player
                // For now, this could be a placeholder or removed
              }}
              className="px-4 py-2 rounded border border-white/20 bg-black/80 backdrop-blur-xl text-white hover:bg-white/10 transition-colors text-sm font-sans"
            >
              Listen
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded border border-white/20 bg-black/80 backdrop-blur-xl text-white hover:bg-white/10 transition-colors text-sm font-sans"
          >
            Explore
          </button>
        )}
      </div>
    </div>
  );
}

