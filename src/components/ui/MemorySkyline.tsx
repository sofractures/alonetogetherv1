"use client";

import { useMemo, useState, useEffect } from "react";

interface MemorySkylineProps {
  memories: string;
  className?: string;
  isAnimating?: boolean;
}

const brickColors = ["#a68361", "#79504a", "#a2736c", "#b1827e"];

export function MemorySkyline({
  memories,
  className = "",
}: MemorySkylineProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Start animation immediately when component mounts (synchronized with title animation)
    // No delay - both animations should start at the same time
    setMounted(true);
  }, []);

  const buildings = useMemo(() => {
    // Process text: split into words and preserve spaces/newlines
    const words = memories.split(/(\s+|\n+)/).filter(w => w.length > 0);
    const buildingCount = Math.floor(Math.random() * 8) + 12; // 12-20 buildings
    const buildingsData = [];
    let wordIndex = 0;

    for (let i = 0; i < buildingCount; i++) {
      const rows = Math.floor(Math.random() * 26) + 5; // 5-30 rows
      const cols = Math.floor(Math.random() * 5) + 8; // 8-13 columns
      const totalCells = rows * cols;

      // Create a 2D grid to fill (rows x cols)
      // We'll fill top to bottom, left to right
      const grid: Array<Array<{ char: string; color?: string } | null>> = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols).fill(null);
      }

      let currentRow = rows - 1; // Start at top row (remember: flex-col-reverse means row 0 is bottom)
      let currentCol = 0;
      let cellsFilled = 0;

      // Fill building completely before moving to next
      while (cellsFilled < totalCells && wordIndex < words.length * 10) { // Safety limit
        // Get current word (loop if we've exhausted all words)
        const word = words[wordIndex % words.length];
        wordIndex++;

        // Try to place the word
        const wordChars = word.split("");
        let wordFits = true;
        let tempRow = currentRow;
        let tempCol = currentCol;

        // Check if word fits on current line
        for (const char of wordChars) {
          if (tempRow < 0) {
            wordFits = false;
            break;
          }
          if (tempCol >= cols) {
            // Move to next row
            tempRow--;
            tempCol = 0;
            if (tempRow < 0) {
              wordFits = false;
              break;
            }
          }
          tempCol++;
        }

        if (wordFits) {
          // Place the word
          for (const char of wordChars) {
            if (currentCol >= cols) {
              currentRow--;
              currentCol = 0;
              if (currentRow < 0) break;
            }
            if (currentRow >= 0) {
              const color =
                char !== " " && char !== "\n"
                  ? brickColors[Math.floor(Math.random() * brickColors.length)]
                  : undefined;
              grid[currentRow][currentCol] = { char, color };
              currentCol++;
              cellsFilled++;
            }
          }
        } else {
          // Word doesn't fit, move to next position
          if (currentCol >= cols) {
            currentRow--;
            currentCol = 0;
            if (currentRow < 0) break;
          } else {
            // Fill current cell with space if empty, then move
            if (grid[currentRow][currentCol] === null) {
              grid[currentRow][currentCol] = { char: " ", color: undefined };
              cellsFilled++;
            }
            currentCol++;
          }
        }

        // Safety check
        if (currentRow < 0) break;
      }

      // Flatten grid to 1D array
      // flex-col-reverse means: first row in array = bottom visually, last row = top visually
      // So we flatten from row 0 (bottom) to row rows-1 (top)
      const buildingChars: Array<{ char: string; color?: string }> = [];
      for (let r = 0; r < rows; r++) { // Bottom to top (for flex-col-reverse)
        for (let c = 0; c < cols; c++) { // Left to right
          buildingChars.push(grid[r][c] || { char: " ", color: undefined });
        }
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

