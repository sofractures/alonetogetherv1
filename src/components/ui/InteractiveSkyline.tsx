"use client";

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

export interface SkylineMemoryItem {
  text: string;
  createdAt?: string;
}

export type SkylineMemoryInput = string | SkylineMemoryItem;

interface InteractiveSkylineProps {
  memories: SkylineMemoryInput[];
  className?: string;
  newMemoryIndex?: number;
  cellWidth?: number;
  cellHeight?: number;
  fontSize?: number;
  trailingGapPx?: number;
  initialScrollToEnd?: boolean;
  hideBuiltInArrows?: boolean;
  onScrollStateChange?: (state: {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    hasOverflow: boolean;
  }) => void;
  onVisibleRangeChange?: (range: {
    startIndex: number;
    endIndex: number;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export interface InteractiveSkylineHandle {
  scrollOlder: () => void;
  scrollNewer: () => void;
}

const brickColors = ["#a68361", "#79504a", "#a2736c", "#b1827e"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function normalizeMemories(memories: SkylineMemoryInput[]): SkylineMemoryItem[] {
  return memories
    .map((m) => (typeof m === "string" ? { text: m } : m))
    .map((m) => ({ text: (m.text || "").trim(), createdAt: m.createdAt }))
    .filter((m) => m.text.length > 0);
}

export const InteractiveSkyline = forwardRef<
  InteractiveSkylineHandle,
  InteractiveSkylineProps
>(function InteractiveSkyline(
  {
    memories,
    className = "",
    newMemoryIndex,
    cellWidth = 8,
    cellHeight = 10,
    fontSize = 9,
    trailingGapPx = 0,
    initialScrollToEnd = false,
    hideBuiltInArrows = false,
    onScrollStateChange,
    onVisibleRangeChange,
  },
  ref
) {
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const buildingRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const normalizedMemories = useMemo(
    () => normalizeMemories(memories),
    [memories]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateVisibleRange = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || normalizedMemories.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    let startIndex = -1;
    let endIndex = -1;

    buildingRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const visible =
        rect.right > containerRect.left + 4 &&
        rect.left < containerRect.right - 4;
      if (visible) {
        if (startIndex === -1) startIndex = i;
        endIndex = i;
      }
    });

    if (startIndex >= 0 && endIndex >= 0) {
      onVisibleRangeChange?.({
        startIndex,
        endIndex,
        startDate: normalizedMemories[startIndex]?.createdAt,
        endDate: normalizedMemories[endIndex]?.createdAt,
      });
    }
  }, [normalizedMemories, onVisibleRangeChange]);

  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(overflow && scrollLeft > 4);
    setCanScrollRight(overflow && scrollLeft < scrollWidth - clientWidth - 4);

    updateVisibleRange();
  }, [updateVisibleRange]);

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState, normalizedMemories]);

  useEffect(() => {
    onScrollStateChange?.({ canScrollLeft, canScrollRight, hasOverflow });
  }, [canScrollLeft, canScrollRight, hasOverflow, onScrollStateChange]);

  const scrollOlder = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const step = Math.max(200, Math.round(container.clientWidth * 0.55));
    container.scrollBy({ left: -step, behavior: "smooth" });
  }, []);

  const scrollNewer = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const step = Math.max(200, Math.round(container.clientWidth * 0.55));
    container.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  useImperativeHandle(ref, () => ({ scrollOlder, scrollNewer }), [
    scrollOlder,
    scrollNewer,
  ]);

  const buildings = useMemo(() => {
    if (normalizedMemories.length === 0) return [];

    return normalizedMemories.map((memory, memoryIndex) => {
      const text = memory.text;
      const seed = hashString(text + memoryIndex);

      const baseRows = Math.min(25, Math.max(8, Math.floor(text.length / 8)));
      const rowVariation = Math.floor(seededRandom(seed) * 8) - 4;
      const rows = Math.max(5, Math.min(30, baseRows + rowVariation));

      const baseCols = Math.min(12, Math.max(6, Math.floor(text.length / 15)));
      const colVariation = Math.floor(seededRandom(seed + 1) * 4) - 2;
      const cols = Math.max(6, Math.min(14, baseCols + colVariation));

      const grid: Array<Array<{ char: string; color?: string } | null>> = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols).fill(null);
      }

      let charIndex = 0;
      const chars = text.split("");

      for (let r = rows - 1; r >= 0 && charIndex < chars.length * 3; r--) {
        for (let c = 0; c < cols && charIndex < chars.length * 3; c++) {
          const actualChar = chars[charIndex % chars.length];
          const colorSeed = seed + charIndex + r * cols + c;
          const color =
            actualChar !== " "
              ? brickColors[Math.floor(seededRandom(colorSeed) * brickColors.length)]
              : undefined;

          grid[r][c] = { char: actualChar, color };
          charIndex++;
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === null) {
            grid[r][c] = { char: " ", color: undefined };
          }
        }
      }

      const buildingChars: Array<{ char: string; color?: string }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          buildingChars.push(grid[r][c] || { char: " ", color: undefined });
        }
      }

      return {
        id: memoryIndex,
        rows,
        cols,
        chars: buildingChars,
        startDelay: memoryIndex * 100,
        isNew: newMemoryIndex !== undefined && memoryIndex === newMemoryIndex,
        memoryIndex,
      };
    });
  }, [normalizedMemories, newMemoryIndex]);

  buildingRefs.current = buildingRefs.current.slice(0, buildings.length);

  const renderChar = (charData: { char: string; color?: string }) => {
    if (charData.char === " " || charData.char === "\n") {
      return (
        <div className="w-full h-full border border-white/60 bg-transparent" />
      );
    }
    return <span style={{ color: charData.color }}>{charData.char}</span>;
  };

  const scrollToEnd = useCallback((smooth: boolean) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      left: container.scrollWidth,
      behavior: smooth ? "smooth" : "auto",
    });
    requestAnimationFrame(() => updateScrollState());
  }, [updateScrollState]);

  useEffect(() => {
    if (newMemoryIndex !== undefined) {
      const timeout = setTimeout(() => scrollToEnd(true), 300);
      return () => clearTimeout(timeout);
    }
  }, [newMemoryIndex, normalizedMemories.length, scrollToEnd]);

  useEffect(() => {
    if (!initialScrollToEnd || normalizedMemories.length === 0) return;
    const timeout = setTimeout(() => scrollToEnd(false), 50);
    const afterAnim = setTimeout(() => updateScrollState(), 2200);
    return () => {
      clearTimeout(timeout);
      clearTimeout(afterAnim);
    };
  }, [normalizedMemories, initialScrollToEnd, scrollToEnd, updateScrollState]);

  if (normalizedMemories.length === 0) {
    return (
      <div className={`flex items-end justify-center px-4 h-32 w-full min-w-0 ${className}`}>
        <p className="text-white/40 text-sm font-mono">
          The city awaits its first memory...
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <div
        ref={scrollContainerRef}
        className="flex items-end gap-1 px-2 sm:px-4 w-full min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth overscroll-x-contain"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {buildings.map((building, i) => (
          <div
            key={`${building.id}-${building.memoryIndex}`}
            ref={(el) => {
              buildingRefs.current[i] = el;
            }}
            className={`relative border-l border-r border-white/10 bg-black/30 flex-shrink-0 ${
              building.isNew ? "ring-2 ring-white/40" : ""
            }`}
            style={{
              minWidth: `${building.cols * cellWidth}px`,
              width: `${building.cols * cellWidth}px`,
              height: `${building.rows * cellHeight}px`,
              transform: mounted ? "scaleY(1)" : "scaleY(0)",
              opacity: mounted ? 1 : 0,
              transformOrigin: "bottom",
              transition: building.isNew
                ? "transform 1500ms ease-out, opacity 1500ms ease-out"
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
                        className="leading-none font-mono flex items-center justify-center"
                        style={{
                          width: `${cellWidth}px`,
                          height: `${cellHeight}px`,
                          fontSize: `${fontSize}px`,
                        }}
                      >
                        {charData ? renderChar(charData) : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
        {trailingGapPx > 0 && (
          <div
            className="flex-shrink-0"
            style={{ width: `${trailingGapPx}px` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
});
