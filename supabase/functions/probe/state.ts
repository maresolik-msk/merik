// Monitor state machine — the part of the probe worth testing on its own.
//
// A single failed check is never an incident. Blips from one probe region are
// the main source of false positives, and a monitoring tool that pages you at
// 3am for a 40-second blip gets switched off within a fortnight. So a monitor
// has to fail CONFIRM_FAILURES times in a row before it is considered down, and
// recover CONFIRM_SUCCESSES times in a row before it is considered up again —
// hysteresis in both directions, which is what stops an oscillating target from
// opening and closing incidents all night.
//
// Detection latency is therefore interval × CONFIRM_FAILURES: 10 minutes on the
// default 5-minute interval, 2 minutes on the 60-second interval. Sub-2-minute
// detection needs the 60s interval, which is the paid frequency lever — not a
// property of this file.

export type MonitorState = "up" | "down" | "unknown";

export const CONFIRM_FAILURES = 2;
export const CONFIRM_SUCCESSES = 2;

export interface StateRow {
  state: MonitorState;
  consecutive_failures: number;
  consecutive_successes: number;
  open_incident_id: string | null;
}

export type StateAction = "none" | "open_incident" | "resolve_incident";

export interface Transition {
  state: MonitorState;
  consecutive_failures: number;
  consecutive_successes: number;
  action: StateAction;
}

export function nextState(
  prev: StateRow,
  ok: boolean,
  opts: { inMaintenance?: boolean } = {},
): Transition {
  if (ok) {
    const successes = prev.consecutive_successes + 1;
    // Coming up needs no protection against false positives — only coming down
    // does. A monitor we know nothing about yet is promoted on its first pass so
    // a freshly added asset isn't stuck reading "unknown" for two intervals.
    const up = prev.state === "unknown" || successes >= CONFIRM_SUCCESSES;
    return {
      state: up ? "up" : prev.state,
      consecutive_failures: 0,
      consecutive_successes: successes,
      action: up && prev.open_incident_id ? "resolve_incident" : "none",
    };
  }

  const failures = prev.consecutive_failures + 1;
  const down = failures >= CONFIRM_FAILURES;
  return {
    state: down ? "down" : prev.state,
    consecutive_failures: failures,
    consecutive_successes: 0,
    // Maintenance windows suppress the incident, not the state. The asset really
    // is down; we just already know why, and self-inflicted alert noise during a
    // deploy is the fastest way to teach people to ignore the alerts.
    action: down && !prev.open_incident_id && !opts.inMaintenance
      ? "open_incident"
      : "none",
  };
}
