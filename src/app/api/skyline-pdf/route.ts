import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { renderSkylinePdf } from "@/lib/skyline-pdf";
import { SKYLINE_FILTERS, isSkylineFilterId } from "@/data/skylineEvents";
import { SKYLINE_PROMPT } from "@/data/skylinePrompts";

export const dynamic = "force-dynamic";

// SECURITY: Normalize an event identifier to a safe slug (same rules as
// /api/skyline-memories).
function sanitizeEventId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

/**
 * GET /api/skyline-pdf
 *
 * Renders the memory skyline for an event as a downloadable vector PDF
 * (e.g. for minting as an NFT).
 *
 * Query params (mutually independent, mirror /api/skyline-memories):
 * - ?filter=all|pilot|event2 — one of the named event windows
 * - ?event=<slug>            — memories tagged with a specific event_id
 */
export async function GET(req: NextRequest) {
  // SECURITY: PDF rendering is heavier than a plain read, so rate limit
  // with the stricter GENERAL bucket.
  const clientIP = getClientIP(req.headers);
  const rateLimitResult = rateLimit(`skyline-pdf:${clientIP}`, RATE_LIMITS.GENERAL);

  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawFilter = req.nextUrl.searchParams.get("filter") ?? "all";
  const filterId = isSkylineFilterId(rawFilter) ? rawFilter : "all";
  const filter = SKYLINE_FILTERS[filterId];

  const rawEvent = req.nextUrl.searchParams.get("event") ?? "";
  const eventId = rawEvent ? sanitizeEventId(rawEvent) : "";

  let query = supabaseServer
    .from("skyline_memories")
    .select("id, text, prompt, event_id, created_at")
    .order("created_at", { ascending: true })
    .limit(500);

  if (eventId) {
    query = query.eq("event_id", eventId);
  } else {
    if (filter.since) query = query.gte("created_at", filter.since);
    if (filter.until) query = query.lt("created_at", filter.until);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching skyline memories for PDF:", error);
    return NextResponse.json(
      { error: "Failed to load skyline memories" },
      { status: 500 }
    );
  }

  const memories = (data ?? [])
    .map((m) => ({
      text: (m.text || "").trim(),
      createdAt: m.created_at as string | undefined,
    }))
    .filter((m) => m.text.length > 0);

  const eventLabel = eventId ? `Event: ${eventId}` : filter.label;
  const fileSlug = eventId ? `event-${eventId}` : filter.slug;

  try {
    const pdfBytes = await renderSkylinePdf({
      memories,
      eventLabel,
      prompt: SKYLINE_PROMPT,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="memory-skyline-${fileSlug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Error rendering skyline PDF:", err);
    return NextResponse.json(
      { error: "Failed to render skyline PDF" },
      { status: 500 }
    );
  }
}
