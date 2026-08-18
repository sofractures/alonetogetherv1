/**
 * Shared, deterministic skyline layout algorithm.
 *
 * Turns a list of memories into "buildings": each memory's characters become
 * bricks in a continuous stream of building façades. This module is pure and
 * runs on both the client (InteractiveSkyline) and the server (PDF export),
 * so the exported PDF matches the skyline page exactly.
 */

export interface SkylineMemoryItem {
  text: string;
  createdAt?: string;
}

export type SkylineMemoryInput = string | SkylineMemoryItem;

export interface SkylineCell {
  char: string;
  color?: string;
  memoryIndex: number;
}

export interface SkylineBuilding {
  id: number;
  rows: number;
  cols: number;
  cells: SkylineCell[];
  memoryIndex: number;
}

export const SKYLINE_BRICK_COLORS = ["#a68361", "#79504a", "#a2736c", "#b1827e"];

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

export function normalizeSkylineMemories(
  memories: SkylineMemoryInput[]
): SkylineMemoryItem[] {
  return memories
    .map((m) => (typeof m === "string" ? { text: m } : m))
    .map((m) => ({ text: (m.text || "").trim(), createdAt: m.createdAt }))
    .filter((m) => m.text.length > 0);
}

export function buildSkylineLayout(
  normalizedMemories: SkylineMemoryItem[]
): SkylineBuilding[] {
  if (normalizedMemories.length === 0) return [];

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

  const allBuildings: SkylineBuilding[] = [];
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
      remaining <= rows * cols && (allBuildings.length > 0 || tinyFilter);
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
    const cells: SkylineCell[] = new Array(totalCells);

    const firstMemoryIndex = stream[cursor].memoryIndex;

    for (let i = 0; i < totalCells; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;

      if (cursor < stream.length) {
        const item = stream[cursor];
        const colorSeed = seed + cursor + r * cols + c;
        cells[i] = {
          char: item.char,
          color:
            item.char !== " "
              ? SKYLINE_BRICK_COLORS[
                  Math.floor(seededRandom(colorSeed) * SKYLINE_BRICK_COLORS.length)
                ]
              : undefined,
          memoryIndex: item.memoryIndex,
        };
        cursor++;
      } else {
        // Rare packing remainder: reuse a brick letter so the façade stays solid
        const wrap = stream[i % stream.length];
        cells[i] = {
          char: wrap.char === " " ? "a" : wrap.char,
          color:
            SKYLINE_BRICK_COLORS[
              Math.floor(seededRandom(seed + i) * SKYLINE_BRICK_COLORS.length)
            ],
          memoryIndex: firstMemoryIndex,
        };
      }
    }

    allBuildings.push({
      id: buildingId,
      rows,
      cols,
      cells,
      memoryIndex: firstMemoryIndex,
    });

    buildingId++;
    if (buildingId > 500) break;
  }

  return allBuildings;
}
