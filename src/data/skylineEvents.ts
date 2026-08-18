/**
 * Shared definitions of skyline events/filters.
 *
 * Used by the skyline page (filter buttons) and by the PDF export route,
 * so both always agree on what each event covers.
 */

export type SkylineFilterId = "all" | "pilot" | "event2";

export interface SkylineEventDef {
  label: string;
  /** Short label safe for filenames, e.g. "pilot-19-mar-2026". */
  slug: string;
  since?: string;
  until?: string;
}

export const SKYLINE_FILTER_ORDER: SkylineFilterId[] = ["all", "pilot", "event2"];

export const SKYLINE_FILTERS: Record<SkylineFilterId, SkylineEventDef> = {
  all: {
    label: "All memories",
    slug: "all-memories",
  },
  pilot: {
    label: "Pilot · 19 Mar",
    slug: "pilot-19-mar-2026",
    since: "2026-03-19T00:00:00Z",
    until: "2026-03-20T00:00:00Z",
  },
  event2: {
    label: "Event 2 · 27 Jun",
    slug: "event-2-27-jun-2026",
    since: "2026-06-27T00:00:00+01:00",
    until: "2026-06-28T00:00:00+01:00",
  },
};

export function isSkylineFilterId(value: string): value is SkylineFilterId {
  return value === "all" || value === "pilot" || value === "event2";
}
