"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";

interface InteractiveSkylineProps {
  memories: string[];
  className?: string;
  newMemoryIndex?: number; // Index of newly added memory to animate
}

const brickColors = ["#a68361", "#79504a", "#a2736c", "#b1827e"];

// Seeded random number generator for deterministic results
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a hash from a string for seeding
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function InteractiveSkyline({
  memories,
  className = "",
  newMemoryIndex,
}: InteractiveSkylineProps) {
  const [mounted, setMounted] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);
      return () => {
        container.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
      };
    }
  }, [updateScrollState, memories]);

  // Handle mouse position for arrow visibility
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Show arrows when cursor is in the edge 15% of the container
    const edgeThreshold = width * 0.15;
    
    setShowLeftArrow(x < edgeThreshold && canScrollLeft);
    setShowRightArrow(x > width - edgeThreshold && canScrollRight);
  }, [canScrollLeft, canScrollRight]);

  const handleMouseLeave = useCallback(() => {
    setShowLeftArrow(false);
    setShowRightArrow(false);
  }, []);

  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }, []);

  // Generate buildings deterministically based on memories
  const buildings = useMemo(() => {
    if (memories.length === 0) {
      return [];
    }

    const buildingsData: Array<{
      id: number;
      rows: number;
      cols: number;
      chars: Array<{ char: string; color?: string }>;
      startDelay: number;
      isNew: boolean;
      memoryIndex: number;
    }> = [];

    // Each memory becomes a building
    memories.forEach((memory, memoryIndex) => {
      const text = memory.trim();
      if (text.length === 0) return;

      // Use the memory text to seed random values for this building
      const seed = hashString(text + memoryIndex);
      
      // Deterministic building dimensions based on text length and seed
      const baseRows = Math.min(25, Math.max(8, Math.floor(text.length / 8)));
      const rowVariation = Math.floor(seededRandom(seed) * 8) - 4;
      const rows = Math.max(5, Math.min(30, baseRows + rowVariation));
      
      const baseCols = Math.min(12, Math.max(6, Math.floor(text.length / 15)));
      const colVariation = Math.floor(seededRandom(seed + 1) * 4) - 2;
      const cols = Math.max(6, Math.min(14, baseCols + colVariation));

      // Create a 2D grid
      const grid: Array<Array<{ char: string; color?: string } | null>> = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols).fill(null);
      }

      // Fill the building with the memory text
      let charIndex = 0;
      const chars = text.split('');
      
      // Fill from top-left, wrapping
      for (let r = rows - 1; r >= 0 && charIndex < chars.length * 3; r--) {
        for (let c = 0; c < cols && charIndex < chars.length * 3; c++) {
          const actualChar = chars[charIndex % chars.length];
          // Use seeded random for color selection
          const colorSeed = seed + charIndex + r * cols + c;
          const color = actualChar !== ' ' 
            ? brickColors[Math.floor(seededRandom(colorSeed) * brickColors.length)]
            : undefined;
          
          grid[r][c] = { char: actualChar, color };
          charIndex++;
        }
      }

      // Fill remaining cells with spaces (lit windows)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === null) {
            grid[r][c] = { char: ' ', color: undefined };
          }
        }
      }

      // Flatten grid
      const buildingChars: Array<{ char: string; color?: string }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          buildingChars.push(grid[r][c] || { char: ' ', color: undefined });
        }
      }

      buildingsData.push({
        id: memoryIndex,
        rows,
        cols,
        chars: buildingChars,
        startDelay: memoryIndex * 100, // Stagger animation
        isNew: newMemoryIndex !== undefined && memoryIndex === newMemoryIndex,
        memoryIndex,
      });
    });

    return buildingsData;
  }, [memories, newMemoryIndex]);

  const renderChar = (charData: { char: string; color?: string }) => {
    if (charData.char === ' ' || charData.char === '\n') {
      return (
        <div className="w-full h-full border border-white/60 bg-transparent" />
      );
    }
    return <span style={{ color: charData.color }}>{charData.char}</span>;
  };

  // Scroll to end when new memory is added
  useEffect(() => {
    if (newMemoryIndex !== undefined && scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }, 300);
    }
  }, [newMemoryIndex, memories.length]);

  if (memories.length === 0) {
    return (
      <div className={`flex items-end justify-center px-4 h-32 ${className}`}>
        <p className="text-white/40 text-sm font-mono">
          The city awaits its first memory...
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Left scroll arrow */}
      <button
        onClick={scrollLeft}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 border border-white/30 text-white/80 hover:bg-black/80 hover:text-white transition-all duration-300 ${
          showLeftArrow ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        aria-label="Scroll left"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {/* Right scroll arrow */}
      <button
        onClick={scrollRight}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 border border-white/30 text-white/80 hover:bg-black/80 hover:text-white transition-all duration-300 ${
          showRightArrow ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        aria-label="Scroll right"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`flex items-end gap-1 px-4 overflow-x-auto overflow-y-hidden scroll-smooth ${className}`}
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {buildings.map((building) => (
          <div
            key={building.id}
            className={`relative border-l border-r border-white/10 bg-black/30 flex-shrink-0 ${
              building.isNew ? 'ring-2 ring-white/40' : ''
            }`}
            style={{
              minWidth: `${building.cols * 8}px`,
              height: `${building.rows * 10}px`,
              transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
              opacity: mounted ? 1 : 0,
              transformOrigin: 'bottom',
              transition: building.isNew
                ? `transform 1500ms ease-out, opacity 1500ms ease-out`
                : `transform 2000ms ease-out ${building.startDelay}ms, opacity 2000ms ease-out ${building.startDelay}ms`,
            }}
          >
            <div className="flex flex-col-reverse">
              {Array.from({ length: building.rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex border-t border-white/5">
                  {Array.from({ length: building.cols }).map((_, colIdx) => {
                    const charIdx = rowIdx * building.cols + colIdx;
                    const charData = building.chars[charIdx];

                    return (
                      <div
                        key={colIdx}
                        className="text-[9px] leading-none font-mono flex items-center justify-center"
                        style={{ width: '8px', height: '10px' }}
                      >
                        {charData ? renderChar(charData) : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

