// Phase 2 decisions: is this outage even ours, and what changed just before it.
//
// Both are deterministic. The blueprint is explicit that change correlation must
// not infer — it ranks by time proximity and says what it found, and a human
// draws the conclusion. An "AI root cause" that is wrong half the time is worse
// than no root cause at all, because people stop reading it and then miss the
// one time it was right.

// ---------------------------------------------------------- vendor status ---

/** Statuspage's indicator vocabulary, worst last. */
export type Indicator = 'none' | 'minor' | 'major' | 'critical' | 'unknown';

/**
 * Is a vendor broken enough to explain a client's site being down?
 *
 * `minor` deliberately does not qualify. Statuspage's "minor" covers a degraded
 * dashboard or one region being slow — suppressing a real outage because a
 * vendor had a minor advisory would mean missing the incident that mattered.
 * Only major and critical suppress.
 */
export const isVendorOutage = (indicator: string | null | undefined): boolean =>
  indicator === 'major' || indicator === 'critical';

/** Statuspage responses vary in completeness; anything unrecognised is unknown. */
export function parseStatuspage(body: unknown): { indicator: Indicator; description: string | null } {
  const status = (body as { status?: { indicator?: unknown; description?: unknown } })?.status;
  const raw = typeof status?.indicator === 'string' ? status.indicator : '';
  const known: Indicator[] = ['none', 'minor', 'major', 'critical'];
  return {
    indicator: (known as string[]).includes(raw) ? raw as Indicator : 'unknown',
    description: typeof status?.description === 'string' ? status.description : null,
  };
}

// -------------------------------------------------------- change correlation ---

export interface ChangeEvent {
  id: string;
  ts: string;
  source: string;
  kind: string;
  ref: string | null;
  title: string | null;
  url: string | null;
  actor: string | null;
}

export interface RankedChange extends ChangeEvent {
  /** Minutes between the change and the incident starting. */
  minutesBefore: number;
}

/** How far back a change is still worth mentioning. */
export const CORRELATION_WINDOW_MIN = 60;

/**
 * Changes that landed shortly before an incident, closest first.
 *
 * Only backwards: a deploy that happened *after* the site went down is the fix,
 * or someone else's unrelated work, and offering it as the suspect would send
 * people down the wrong path. Ties break toward the later change — of two deploys
 * a minute apart, the nearer one is the better first place to look.
 */
export function correlateChanges(
  changes: ChangeEvent[],
  incidentStart: string,
  windowMin: number = CORRELATION_WINDOW_MIN,
): RankedChange[] {
  const start = new Date(incidentStart).getTime();
  return changes
    .map((c) => ({ ...c, minutesBefore: (start - new Date(c.ts).getTime()) / 60_000 }))
    .filter((c) => c.minutesBefore >= 0 && c.minutesBefore <= windowMin)
    .sort((a, b) => a.minutesBefore - b.minutesBefore)
    .map((c) => ({ ...c, minutesBefore: Math.round(c.minutesBefore) }));
}

/** One line for the incident timeline. Describes, never concludes. */
export function describeChange(c: RankedChange): string {
  const who = c.actor ? ` by ${c.actor}` : '';
  const what = c.title || c.ref || c.kind;
  return `${c.kind} on ${c.source}${who}, ${c.minutesBefore} min before this started: ${what}`;
}
