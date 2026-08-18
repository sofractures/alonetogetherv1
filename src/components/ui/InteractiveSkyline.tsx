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
import {
  buildSkylineLayout,
  normalizeSkylineMemories,
  type SkylineMemoryInput,
  type SkylineMemoryItem,
} from "@/lib/skyline-layout";

export type { SkylineMemoryInput, SkylineMemoryItem };

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
    () => normalizeSkylineMemories(memories),
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
    return buildSkylineLayout(normalizedMemories).map((building) => ({
      id: building.id,
      rows: building.rows,
      cols: building.cols,
      chars: building.cells,
      startDelay: building.id * 80,
      isNew:
        newMemoryIndex !== undefined &&
        building.cells.some((cell) => cell.memoryIndex === newMemoryIndex),
      memoryIndex: building.memoryIndex,
    }));
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
