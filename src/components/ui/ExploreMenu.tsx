"use client";

import { useRouter } from "next/navigation";

interface ExploreMenuProps {
  currentPage?: "explore" | "skyline";
  onCreate?: () => void;
}

export function ExploreMenu({ currentPage = "explore", onCreate }: ExploreMenuProps) {
  const router = useRouter();

  return (
    <div className="absolute top-0 right-0 z-20 p-2 sm:p-3 md:p-6">
      <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3 items-end">
        {currentPage === "explore" ? (
          <>
            {onCreate && (
              <button
                onClick={onCreate}
                className="transition-colors text-xs sm:text-sm font-sans"
                style={{ color: '#e5ddc7' }}
              >
                Create
              </button>
            )}
            <button
              onClick={() => router.push("/skyline")}
              className="text-white hover:text-gray-300 transition-colors text-xs sm:text-sm font-sans"
            >
              Skyline
            </button>
            <button
              onClick={() => router.push("/about")}
              className="text-white hover:text-gray-300 transition-colors text-xs sm:text-sm font-sans"
            >
              About
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => router.push("/")}
              className="text-white hover:text-gray-300 transition-colors text-xs sm:text-sm font-sans"
            >
              Explore
            </button>
            <button
              onClick={() => router.push("/about")}
              className="text-white hover:text-gray-300 transition-colors text-xs sm:text-sm font-sans"
            >
              About
            </button>
          </>
        )}
      </div>
    </div>
  );
}

