// Giraffe usage analytics helper – parses public/giraffeusagedata.csv and
// exposes useful aggregations for charts and tables.

import { differenceInCalendarDays, parse, parseISO } from "date-fns";

export interface GiraffeUserSnapshot {
  email: string;
  /** Latest date (ISO yyyy-mm-dd) on which the user appeared, or undefined if never */
  lastSeen?: string;
  /** First date (ISO) the user appeared in the snapshots */
  firstSeen?: string;
  /** Map keyed by snapshot ISO date where the user had a non-blank, non-0 value. */
  appearances: Record<string, string>;
}

export interface GiraffeUsageData {
  /** Ordered list of snapshot ISO dates present in the file header. */
  snapshotDates: string[];
  /** All parsed user rows keyed by canonical email (lower-case). */
  users: Record<string, GiraffeUserSnapshot>;
  /** Active-user count per snapshot ISO date. */
  activeCounts: Record<string, number>;
}

const CSV_URL = "/giraffeusagedata.csv";

/** Fetches and parses the Giraffe usage CSV found in /public.
 *  Returns structured data for downstream visualisations. */
export async function fetchGiraffeUsageData(
  src: string = CSV_URL
): Promise<GiraffeUsageData> {
  const resp = await fetch(src);
  if (!resp.ok) {
    throw new Error(`Failed to fetch Giraffe CSV from ${src} – ${resp.status}`);
  }
  const csvText = await resp.text();
  return parseGiraffeCsv(csvText);
}

/** Core CSV parser. Can be called with csv text directly (useful in tests). */
export function parseGiraffeCsv(csv: string): GiraffeUsageData {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV appears to have no content");
  }

  // ─── Header ──────────────────────────────────────────────────────────────
  const header = lines[0].split(",").map((h) => h.trim());
  // First column is "Email"; remaining columns are snapshot dates.
  const snapshotDates = header.slice(1).map(normaliseHeaderDate);

  // Prepare accumulators
  const users: Record<string, GiraffeUserSnapshot> = {};
  // Active users per snapshot – counts users whose lastSeen date equals snapshot date.
  const activeCounts: Record<string, number> = Object.fromEntries(
    snapshotDates.map((d) => [d, 0])
  );

  // ─── Rows ────────────────────────────────────────────────────────────────
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    const rawEmail = (row[0] || "").toLowerCase().trim();
    if (!rawEmail) continue; // skip empty email rows

    const user: GiraffeUserSnapshot =
      users[rawEmail] || {
        email: rawEmail,
        appearances: {},
      };

    let prevDateIso: string | null = null;

    // Walk each snapshot column
    for (let c = 1; c < header.length; c++) {
      const cell = (row[c] || "").trim();
      const snapIso = snapshotDates[c - 1];

      if (cell && cell !== "0") {
        const cellIso = normaliseHeaderDate(cell);

        // Record appearance
        user.appearances[snapIso] = cell;

        // Update first/last seen helpers - use the actual activity date from the cell
        if (!user.firstSeen) user.firstSeen = cellIso;
        // For lastSeen, use the latest activity date (cellIso), not the snapshot date
        if (!user.lastSeen || cellIso > user.lastSeen) {
          user.lastSeen = cellIso;
        }

        // Determine activity compared to previous snapshot
        if (prevDateIso === null || cellIso > prevDateIso) {
          activeCounts[snapIso] += 1;
        }

        prevDateIso = cellIso;
      } else {
        // No value – carry forward previous date for comparison logic
        // prevDateIso remains unchanged
      }
    }

    users[rawEmail] = user;
  }

  return { snapshotDates, users, activeCounts };
}

/** Returns number of calendar days since the supplied ISO date until today. */
export function daysSinceLastSeen(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const last = parseISO(isoDate);
  const days = differenceInCalendarDays(new Date(), last);
  
  // If the date is in the future (negative days), treat as 0 days (very recent)
  if (days < 0) {
    return 0;
  }
  
  return days;
}

/** Convert a header like "11-Mar-24" or "26-Nov-2024" to ISO yyyy-mm-dd. */
function normaliseHeaderDate(raw: string): string {
  const clean = raw.replace(/\s+/g, "");
  // Support both two-digit and four-digit year.
  const parsed = parse(clean, "d-MMM-yy", new Date());
  if (isNaN(parsed.getTime())) {
    // try four-digit
    const alt = parse(clean, "d-MMM-yyyy", new Date());
    if (isNaN(alt.getTime())) {
      throw new Error(`Unrecognised date in CSV header: ${raw}`);
    }
    return alt.toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
} 