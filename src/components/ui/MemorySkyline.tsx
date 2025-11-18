"use client";

import { useMemo, useState, useEffect } from "react";

interface MemorySkylineProps {
  memories: string;
  className?: string;
  isAnimating?: boolean;
}

export function MemorySkyline({
  memories,
  className = "",
  isAnimating = true,
}: MemorySkylineProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isAnimating) {
      setMounted(true);
      return;
    }

    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, [isAnimating]);

  const brickColors = ["#a68361", "#79504a", "#a2736c", "#b1827e"];

  const buildings = useMemo(() => {
    const allChars = memories.split("");
    const buildingCount = Math.floor(Math.random() * 8) + 12; // 12-20 buildings
    const buildingsData = [];
    let charIndex = 0;

    for (let i = 0; i < buildingCount; i++) {
      const rows = Math.floor(Math.random() * 26) + 5; // 5-30 rows
      const cols = Math.floor(Math.random() * 5) + 8; // 8-13 columns
      const charsInBuilding = rows * cols;

      const buildingChars: Array<{ char: string; color?: string }> = [];
      for (let j = 0; j < charsInBuilding; j++) {
        if (charIndex >= allChars.length) charIndex = 0; // Loop back to start
        const char = allChars[charIndex];
        // Pre-assign color for letters (not spaces/newlines)
        const color =
          char !== " " && char !== "\n"
            ? brickColors[Math.floor(Math.random() * brickColors.length)]
            : undefined;
        buildingChars.push({ char, color });
        charIndex++;
      }

      buildingsData.push({
        id: i,
        rows,
        cols,
        chars: buildingChars,
        startDelay: i * 80, // 80ms stagger between buildings
      });
    }

    return buildingsData;
  }, [memories]);

  const renderChar = (charData: { char: string; color?: string }) => {
    // Render spaces as white outlined squares
    if (charData.char === " " || charData.char === "\n") {
      return (
        <div className="w-full h-full border border-white/60 bg-transparent" />
      );
    }

    // Render letters with pre-assigned brick color
    return <span style={{ color: charData.color }}>{charData.char}</span>;
  };

  return (
    <div className={`flex items-end gap-0.5 px-4 ${className}`}>
      {buildings.map((building) => (
        <div
          key={building.id}
          className="relative border-l border-r border-white/10 bg-black/30"
          style={{
            minWidth: `${building.cols * 8}px`,
            height: `${building.rows * 10}px`,
            transform: mounted ? "scaleY(1)" : "scaleY(0)",
            opacity: mounted ? 1 : 0,
            transformOrigin: "bottom",
            transition: `transform 2800ms ease-out ${building.startDelay}ms, opacity 2800ms ease-out ${building.startDelay}ms`,
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
                      style={{ width: "8px", height: "10px" }}
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
    </div>
  );
}

