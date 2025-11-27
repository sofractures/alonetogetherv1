"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ExploreMenuProps {
  currentPage?: "explore" | "skyline" | "about";
  onCreate?: () => void;
}

export function ExploreMenu({ currentPage = "explore", onCreate }: ExploreMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);

  const handleNavigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const handleCreate = () => {
    setOpen(false);
    onCreate?.();
  };

  return (
    <div className="absolute top-0 right-0 z-20 p-2 sm:p-3 md:p-6">
      <div className="relative">
        {/* Top-right Menu trigger */}
        <button
          type="button"
          onClick={toggle}
          className="px-3 py-1.5 rounded border border-white/40 bg-black/60 hover:bg-black/80 text-xs sm:text-sm font-sans"
          style={{ color: '#e5ddc7' }}
        >
          Menu
        </button>

        {/* Dropdown options */}
        {open && (
          <div className="absolute right-0 mt-2 w-32 rounded border border-white/20 bg-black/80 backdrop-blur-md shadow-lg py-1 text-xs sm:text-sm font-sans">
            {currentPage === "explore" && onCreate && (
              <button
                type="button"
                onClick={handleCreate}
                className="block w-full px-3 py-1.5 text-right text-white hover:text-black hover:bg-white/90 transition-colors"
              >
                Create
              </button>
            )}

            {currentPage !== "explore" && (
              <button
                type="button"
                onClick={() => handleNavigate("/")}
                className="block w-full px-3 py-1.5 text-right text-white hover:text-black hover:bg-white/90 transition-colors"
              >
                Explore
              </button>
            )}

            {currentPage !== "skyline" && (
              <button
                type="button"
                onClick={() => handleNavigate("/skyline")}
                className="block w-full px-3 py-1.5 text-right text-white hover:text-black hover:bg-white/90 transition-colors"
              >
                Skyline
              </button>
            )}

            {currentPage !== "about" && (
              <button
                type="button"
                onClick={() => handleNavigate("/about")}
                className="block w-full px-3 py-1.5 text-right text-white hover:text-black hover:bg-white/90 transition-colors"
              >
                About
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

