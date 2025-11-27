"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
        <motion.button
          type="button"
          onClick={toggle}
          className="px-3 py-1.5 rounded border border-white/40 bg-black/60 hover:bg-black/80 text-xs sm:text-sm font-sans"
          style={{ color: '#e5ddc7' }}
          whileTap={{ scale: 0.97 }}
          whileHover={{ backgroundColor: "rgba(0,0,0,0.9)" }}
        >
          Menu
        </motion.button>

        {/* Dropdown options */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scaleY: 0.9 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.9 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute right-0 mt-2 w-32 origin-top rounded border border-white/20 bg-black/80 backdrop-blur-md shadow-lg py-1 text-xs sm:text-sm font-sans"
            >
              {currentPage === "explore" && onCreate && (
                <motion.button
                  type="button"
                  onClick={handleCreate}
                  className="block w-full px-3 py-1.5 text-right hover:bg-white/10 transition-colors"
                  style={{ color: '#e5ddc7' }}
                  whileHover={{ x: -2 }}
                >
                  Create
                </motion.button>
              )}

              {currentPage !== "explore" && (
                <motion.button
                  type="button"
                  onClick={() => handleNavigate("/")}
                  className="block w-full px-3 py-1.5 text-right hover:bg-white/10 transition-colors"
                  style={{ color: '#e5ddc7' }}
                  whileHover={{ x: -2 }}
                >
                  Explore
                </motion.button>
              )}

              {currentPage !== "skyline" && (
                <motion.button
                  type="button"
                  onClick={() => handleNavigate("/skyline")}
                  className="block w-full px-3 py-1.5 text-right hover:bg-white/10 transition-colors"
                  style={{ color: '#e5ddc7' }}
                  whileHover={{ x: -2 }}
                >
                  Skyline
                </motion.button>
              )}

              {currentPage !== "about" && (
                <motion.button
                  type="button"
                  onClick={() => handleNavigate("/about")}
                  className="block w-full px-3 py-1.5 text-right hover:bg-white/10 transition-colors"
                  style={{ color: '#e5ddc7' }}
                  whileHover={{ x: -2 }}
                >
                  About
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

