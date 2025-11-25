"use client";

import { useRouter } from "next/navigation";

interface ExploreMenuProps {
  currentPage?: "explore" | "skyline";
  onCreate?: () => void;
}

export function ExploreMenu({ currentPage = "explore", onCreate }: ExploreMenuProps) {
  const router = useRouter();

  return (
    <div className="absolute top-0 right-0 z-20 p-4 md:p-6">
      <div className="flex flex-col gap-3 items-end">
        {currentPage === "explore" ? (
          <>
            {onCreate && (
              <button
                onClick={onCreate}
                className="transition-colors text-sm font-sans"
                style={{ color: '#e5ddc7' }}
              >
                Create
              </button>
            )}
            <button
              onClick={() => router.push("/skyline")}
              className="text-white hover:text-gray-300 transition-colors text-sm font-sans"
            >
              Skyline
            </button>
            {/* Listen button - can be used for future functionality */}
            <button
              onClick={() => {
                // Future: Could open a playlist or audio player
                // For now, this could be a placeholder or removed
              }}
              className="text-white hover:text-gray-300 transition-colors text-sm font-sans"
            >
              Listen
            </button>
          </>
        ) : (
          <button
            onClick={() => router.push("/")}
            className="text-white hover:text-gray-300 transition-colors text-sm font-sans"
          >
            Explore
          </button>
        )}
      </div>
    </div>
  );
}

