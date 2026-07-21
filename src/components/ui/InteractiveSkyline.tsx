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
      const startEl = buildingRefs.current[startIndex];
      const endEl = buildingRefs.current[endIndex];
      const startMemoryIdx = Number(
        startEl?.dataset.memoryIndex ?? startIndex
      );
      const endMemoryIdx = Number(endEl?.dataset.memoryIndex ?? endIndex);
      onVisibleRangeChange?.({
        startIndex: startMemoryIdx,
        endIndex: endMemoryIdx,
        startDate: normalizedMemories[startMemoryIdx]?.createdAt,
        endDate: normalizedMemories[endMemoryIdx]?.createdAt,
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

    type Cell = { char: string; color?: string; memoryIndex: number };
    type BuildingData = {
      id: number;
      rows: number;
      cols: number;
      chars: Array<{ char: string; color?: string }>;
      startDelay: number;
      isNew: boolean;
      memoryIndex: number;
    };

    // Continuous character stream across all memories (book-page order).
    // Spaces between words → white squares; no unused/empty cells.
    const stream: Array<{ char: string; memoryIndex: number }> = [];
    normalizedMemories.forEach((memory, memoryIndex) => {
      const words = memory.text
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter((w) => w.length > 0);
      if (words.length === 0) return;

      // Single space between memories so the next one starts immediately
      if (stream.length > 0) {
        stream.push({ char: " ", memoryIndex });
      }

      words.forEach((word, wi) => {
        if (wi > 0) stream.push({ char: " ", memoryIndex });
        for (const char of word) {
          stream.push({ char, memoryIndex });
        }
      });
    });

    if (stream.length === 0) return [];

    const allBuildings: BuildingData[] = [];
    let cursor = 0;
    let buildingId = 0;
    const MIN_ROWS = 8;
    const MAX_ROWS = 28;
    // Fixed silhouette accents — used so every filter (even small ones)
    // gets a skyline profile, not a flat row. Home MemorySkyline is separate.
    const HEIGHT_BEATS = [22, 11, 26, 14, 19, 9, 24, 13, 17, 28, 12, 20, 10, 23, 15];

    while (cursor < stream.length) {
      const remaining = stream.length - cursor;
      const seed = hashString(stream[cursor].char + cursor + ":" + buildingId);
      const prevRows =
        allBuildings.length > 0
          ? allBuildings[allBuildings.length - 1].rows
          : null;

      let cols = Math.max(6, Math.min(13, 7 + Math.floor(seededRandom(seed) * 6)));

      // Start from a beat height, then jitter — always varies across filters
      let rows = HEIGHT_BEATS[buildingId % HEIGHT_BEATS.length];
      rows += Math.floor(seededRandom(seed + 1) * 5) - 2; // ±2 jitter
      rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows));

      // Hard rule: never match (or nearly match) the neighbour's height
      if (prevRows !== null && Math.abs(rows - prevRows) < 5) {
        const step = 5 + Math.floor(seededRandom(seed + 4) * 8);
        if (prevRows + step <= MAX_ROWS) {
          rows = prevRows + step;
        } else if (prevRows - step >= MIN_ROWS) {
          rows = prevRows - step;
        } else {
          rows = prevRows >= 18 ? MIN_ROWS + 1 : MAX_ROWS - 1;
        }
      }

      // Only shrink after at least one full skyline building exists (or the
      // whole filter is too small for even one). This stops small event
      // filters from packing every façade to the same flat height.
      const tinyFilter = remaining < MIN_ROWS * 6;
      const isLastStretch =
        remaining <= rows * cols &&
        (allBuildings.length > 0 || tinyFilter);
      if (isLastStretch) {
        // Keep the chosen height when possible; widen/narrow cols to pack solidly
        let bestCols = cols;
        let bestRows = Math.max(1, Math.ceil(remaining / cols));
        let bestScore = Infinity;

        for (let c = 6; c <= 13; c++) {
          const r = Math.ceil(remaining / c);
          if (r < 1 || r > MAX_ROWS) continue;
          const waste = r * c - remaining;
          const heightDiff = Math.abs(r - rows);
          const neighbourPenalty =
            prevRows !== null && Math.abs(r - prevRows) < 5 ? 50 : 0;
          const score = waste * 15 + heightDiff * 2 + neighbourPenalty;
          if (score < bestScore) {
            bestScore = score;
            bestCols = c;
            bestRows = r;
          }
        }
        cols = bestCols;
        rows = bestRows;

        // Final guard against a flat neighbour pair on short filters
        if (prevRows !== null && Math.abs(rows - prevRows) < 4) {
          for (const c of [6, 7, 8, 9, 10, 11, 12, 13]) {
            const r = Math.ceil(remaining / c);
            if (r < MIN_ROWS || r > MAX_ROWS) continue;
            if (Math.abs(r - prevRows) >= 5 && r * c - remaining <= 8) {
              cols = c;
              rows = r;
              break;
            }
          }
        }
      }

      const totalCells = rows * cols;
      const grid: Cell[][] = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols);
      }

      const firstMemoryIndex = stream[cursor].memoryIndex;
      let containsNew = false;

      for (let i = 0; i < totalCells; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;

        if (cursor < stream.length) {
          const item = stream[cursor];
          const colorSeed = seed + cursor + r * cols + c;
          grid[r][c] = {
            char: item.char,
            color:
              item.char !== " "
                ? brickColors[Math.floor(seededRandom(colorSeed) * brickColors.length)]
                : undefined,
            memoryIndex: item.memoryIndex,
          };
          if (
            newMemoryIndex !== undefined &&
            item.memoryIndex === newMemoryIndex
          ) {
            containsNew = true;
          }
          cursor++;
        } else {
          // Rare packing remainder: reuse a brick letter so the façade stays solid
          const wrap = stream[i % stream.length];
          grid[r][c] = {
            char: wrap.char === " " ? "a" : wrap.char,
            color: brickColors[Math.floor(seededRandom(seed + i) * brickColors.length)],
            memoryIndex: firstMemoryIndex,
          };
        }
      }

      const buildingChars = grid.flat().map(({ char, color }) => ({ char, color }));

      allBuildings.push({
        id: buildingId,
        rows,
        cols,
        chars: buildingChars,
        startDelay: buildingId * 80,
        isNew: containsNew,
        memoryIndex: firstMemoryIndex,
      });

      buildingId++;
      if (buildingId > 500) break;
    }

    return allBuildings;
  }, [normalizedMemories, newMemoryIndex]);

  buildingRefs.current = buildingRefs.current.slice(0, buildings.length);

  const renderChar = (charData: { char: string; color?: string }) => {
    // Real word/memory spaces → white outlined squares
    if (charData.char === " " || charData.char === "\n") {
      return (
        <div
          className="border border-white/60 bg-transparent"
          style={{
            width: Math.max(2, cellWidth - 2),
            height: Math.max(2, cellHeight - 2),
          }}
        />
      );
    }
    return (
      <span
        style={{
          color: charData.color,
          display: "block",
          lineHeight: 1,
          transform: "translateY(-0.5px)",
        }}
      >
        {charData.char}
      </span>
    );
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
    <div className={`relative w-full min-w-0 h-full flex flex-col justify-end ${className}`}>
      <div
        ref={scrollContainerRef}
        className="flex items-end gap-1 px-2 sm:px-4 w-full min-w-0 overflow-x-auto overflow-y-visible scroll-smooth overscroll-x-contain"
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
            data-memory-index={building.memoryIndex}
            className={`relative border-l border-r border-white/10 bg-black/30 flex-shrink-0 self-end overflow-visible ${
              building.isNew ? "ring-2 ring-inset ring-white/40" : ""
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
            <div className="flex flex-col h-full">
              {Array.from({ length: building.rows }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex"
                  style={{ height: `${cellHeight}px` }}
                >
                  {Array.from({ length: building.cols }).map((_, colIdx) => {
                    const charIdx = rowIdx * building.cols + colIdx;
                    const charData = building.chars[charIdx];

                    return (
                      <div
                        key={colIdx}
                        className="font-mono flex items-center justify-center overflow-visible box-border"
                        style={{
                          width: `${cellWidth}px`,
                          height: `${cellHeight}px`,
                          fontSize: `${fontSize}px`,
                          lineHeight: `${fontSize}px`,
                          paddingBottom: 1,
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
            className="flex-shrink-0 self-end"
            style={{ width: `${trailingGapPx}px`, height: 1 }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
});
