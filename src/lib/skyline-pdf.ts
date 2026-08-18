/**
 * Server-side PDF renderer for the memory skyline.
 *
 * Renders the exact same deterministic building layout as the skyline page
 * (via buildSkylineLayout) as pure vector art, so the PDF stays crisp at any
 * zoom level — a good archival/mintable format for NFTs.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import {
  buildSkylineLayout,
  normalizeSkylineMemories,
  type SkylineBuilding,
  type SkylineMemoryItem,
} from "./skyline-layout";

export interface SkylinePdfOptions {
  memories: SkylineMemoryItem[];
  /** Human-readable event label, e.g. "Pilot · 19 Mar". */
  eventLabel: string;
  /** The prompt people answered, shown under the title. */
  prompt?: string;
}

// Cell geometry in PDF points (page uses 12x16 px cells with 12px font;
// same proportions here, scaled down so a full event fits one page).
const CELL_W = 6;
const CELL_H = 8;
const FONT_SIZE = 7;
const BUILDING_GAP = 3;

const PAGE_WIDTH = 1200;
const MARGIN_X = 54;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const STRIP_GAP = 30;
const HEADER_HEIGHT = 118;
const FOOTER_HEIGHT = 34;

const COLOR_BG = rgb(0.02, 0.02, 0.025);
const COLOR_WHITE = rgb(1, 1, 1);

function hexToRgb(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return rgb(
    ((value >> 16) & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    (value & 0xff) / 255
  );
}

interface Strip {
  buildings: SkylineBuilding[];
  /** Height of the tallest building in the strip, in points. */
  height: number;
}

/** Wrap buildings into horizontal strips that fit the content width. */
function packStrips(buildings: SkylineBuilding[]): Strip[] {
  const strips: Strip[] = [];
  let current: SkylineBuilding[] = [];
  let currentWidth = 0;

  for (const building of buildings) {
    const width = building.cols * CELL_W;
    const widthWithGap = current.length > 0 ? width + BUILDING_GAP : width;
    if (current.length > 0 && currentWidth + widthWithGap > CONTENT_WIDTH) {
      strips.push({
        buildings: current,
        height: Math.max(...current.map((b) => b.rows)) * CELL_H,
      });
      current = [building];
      currentWidth = width;
    } else {
      current.push(building);
      currentWidth += widthWithGap;
    }
  }

  if (current.length > 0) {
    strips.push({
      buildings: current,
      height: Math.max(...current.map((b) => b.rows)) * CELL_H,
    });
  }

  return strips;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildStatsLine(memories: SkylineMemoryItem[]): string {
  const count = memories.length;
  const countLabel = `${count} ${count === 1 ? "memory" : "memories"}`;

  const dates = memories
    .map((m) => m.createdAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const first = formatDate(dates[0]);
  const last = formatDate(dates[dates.length - 1]);

  if (first && last) {
    return first === last
      ? `${countLabel} · ${first}`
      : `${countLabel} · ${first} – ${last}`;
  }
  return countLabel;
}

function drawBuilding(
  page: PDFPage,
  font: PDFFont,
  building: SkylineBuilding,
  originX: number,
  baselineY: number,
  safeChar: (char: string) => string
) {
  const width = building.cols * CELL_W;
  const height = building.rows * CELL_H;

  // Façade backdrop + faint side walls (mirrors bg-black/30 + border-white/10)
  page.drawRectangle({
    x: originX,
    y: baselineY,
    width,
    height,
    color: COLOR_WHITE,
    opacity: 0.035,
  });
  for (const x of [originX, originX + width]) {
    page.drawLine({
      start: { x, y: baselineY },
      end: { x, y: baselineY + height },
      thickness: 0.5,
      color: COLOR_WHITE,
      opacity: 0.12,
    });
  }

  const charWidth = font.widthOfTextAtSize("M", FONT_SIZE);

  for (let r = 0; r < building.rows; r++) {
    for (let c = 0; c < building.cols; c++) {
      const cell = building.cells[r * building.cols + c];
      if (!cell) continue;

      const cellX = originX + c * CELL_W;
      // Row 0 is the top of the building.
      const cellY = baselineY + (building.rows - 1 - r) * CELL_H;

      if (cell.char === " " || cell.char === "\n") {
        // Word gaps become white outlined squares, like on the page
        page.drawRectangle({
          x: cellX + 0.9,
          y: cellY + 1.1,
          width: CELL_W - 1.8,
          height: CELL_H - 2.2,
          borderColor: COLOR_WHITE,
          borderOpacity: 0.6,
          borderWidth: 0.5,
        });
        continue;
      }

      page.drawText(safeChar(cell.char), {
        x: cellX + (CELL_W - charWidth) / 2,
        y: cellY + (CELL_H - FONT_SIZE * 0.72) / 2,
        size: FONT_SIZE,
        font,
        color: cell.color ? hexToRgb(cell.color) : COLOR_WHITE,
      });
    }
  }
}

export async function renderSkylinePdf(
  options: SkylinePdfOptions
): Promise<Uint8Array> {
  const memories = normalizeSkylineMemories(options.memories);
  const buildings = buildSkylineLayout(memories);
  const strips = packStrips(buildings);

  const skylineHeight =
    strips.length > 0
      ? strips.reduce((sum, s) => sum + s.height, 0) +
        STRIP_GAP * (strips.length - 1)
      : 60;

  const pageHeight =
    MARGIN_TOP + HEADER_HEIGHT + skylineHeight + FOOTER_HEIGHT + MARGIN_BOTTOM;

  const doc = await PDFDocument.create();
  doc.setTitle(`Alone Together — Memory Skyline — ${options.eventLabel}`);
  doc.setAuthor("Alone Together");
  doc.setSubject(
    "A collective skyline built from shared memories. Every brick is a letter."
  );
  doc.setKeywords(["alone together", "memory skyline", "nft", options.eventLabel]);
  doc.setCreationDate(new Date());

  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);

  // Standard fonts only cover WinAnsi; swap anything else (emoji, etc.)
  // for a neutral brick character so encoding never throws.
  const supported = new Set(mono.getCharacterSet());
  const fallback = supported.has(0xb7) ? "\u00b7" : "+";
  const safeChar = (char: string): string => {
    const codePoint = char.codePointAt(0);
    return codePoint !== undefined && supported.has(codePoint) ? char : fallback;
  };
  const safeText = (text: string): string =>
    Array.from(text).map(safeChar).join("");

  const page = doc.addPage([PAGE_WIDTH, pageHeight]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: pageHeight,
    color: COLOR_BG,
  });

  // --- Header ---
  let y = pageHeight - MARGIN_TOP;

  page.drawText("A L O N E   T O G E T H E R", {
    x: MARGIN_X,
    y,
    size: 9,
    font: mono,
    color: COLOR_WHITE,
    opacity: 0.55,
  });
  y -= 26;

  page.drawText("Memory Skyline", {
    x: MARGIN_X,
    y,
    size: 22,
    font: monoBold,
    color: COLOR_WHITE,
  });

  const labelText = safeText(options.eventLabel);
  const labelSize = 11;
  page.drawText(labelText, {
    x: PAGE_WIDTH - MARGIN_X - monoBold.widthOfTextAtSize(labelText, labelSize),
    y: y + 6,
    size: labelSize,
    font: monoBold,
    color: COLOR_WHITE,
    opacity: 0.85,
  });

  const statsText = safeText(buildStatsLine(memories));
  page.drawText(statsText, {
    x: PAGE_WIDTH - MARGIN_X - mono.widthOfTextAtSize(statsText, 8.5),
    y: y - 8,
    size: 8.5,
    font: mono,
    color: COLOR_WHITE,
    opacity: 0.5,
  });
  y -= 20;

  if (options.prompt) {
    page.drawText(safeText(`“${options.prompt}”`), {
      x: MARGIN_X,
      y,
      size: 9,
      font: mono,
      color: COLOR_WHITE,
      opacity: 0.6,
    });
  }
  y -= 22;

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 0.5,
    color: COLOR_WHITE,
    opacity: 0.25,
  });

  // --- Skyline strips ---
  let stripTop = pageHeight - MARGIN_TOP - HEADER_HEIGHT;

  if (strips.length === 0) {
    page.drawText("The city awaits its first memory...", {
      x: MARGIN_X,
      y: stripTop - 30,
      size: 10,
      font: mono,
      color: COLOR_WHITE,
      opacity: 0.4,
    });
  }

  for (const strip of strips) {
    const groundY = stripTop - strip.height;
    let x = MARGIN_X;

    for (const building of strip.buildings) {
      drawBuilding(page, mono, building, x, groundY, safeChar);
      x += building.cols * CELL_W + BUILDING_GAP;
    }

    // Ground line under the strip
    page.drawLine({
      start: { x: MARGIN_X, y: groundY - 2 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: groundY - 2 },
      thickness: 0.6,
      color: COLOR_WHITE,
      opacity: 0.2,
    });

    stripTop = groundY - STRIP_GAP;
  }

  // --- Footer ---
  page.drawText(
    "Every brick in this skyline is a letter from a memory shared at this event.",
    {
      x: MARGIN_X,
      y: MARGIN_BOTTOM,
      size: 8,
      font: mono,
      color: COLOR_WHITE,
      opacity: 0.45,
    }
  );

  const generatedText = `Generated ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
  page.drawText(generatedText, {
    x: PAGE_WIDTH - MARGIN_X - mono.widthOfTextAtSize(generatedText, 8),
    y: MARGIN_BOTTOM,
    size: 8,
    font: mono,
    color: COLOR_WHITE,
    opacity: 0.45,
  });

  return doc.save();
}
