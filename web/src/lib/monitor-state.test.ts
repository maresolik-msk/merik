// The probe's state machine is the one piece of Digital Operations logic that
// decides whether a human gets woken up, so it is tested here rather than in
// Deno — this is the suite CI already runs. The import reaches into the Edge
// Function's source on purpose: one copy of the rules, not two.
import { describe, expect, it } from "vitest";
import {
  CONFIRM_FAILURES,
  nextState,
  type StateRow,
} from "../../../supabase/functions/probe/state";

const row = (p: Partial<StateRow> = {}): StateRow => ({
  state: "up",
  consecutive_failures: 0,
  consecutive_successes: 5,
  open_incident_id: null,
  ...p,
});

describe("monitor state machine", () => {
  it("never turns one failed check into an incident", () => {
    const t = nextState(row(), false);
    expect(t.state).toBe("up");
    expect(t.action).toBe("none");
  });

  it("opens exactly one incident once failures are confirmed", () => {
    let s = row();
    let opened = 0;
    for (let i = 0; i < 5; i++) {
      const t = nextState(s, false);
      if (t.action === "open_incident") opened++;
      s = { ...s, ...t, open_incident_id: opened ? "inc-1" : null };
    }
    expect(s.state).toBe("down");
    expect(opened).toBe(1);
  });

  it("does not reopen incidents for a flapping target", () => {
    // fail, fail (down + incident), one recovery, then fail again: the single
    // success must not close the incident and the next failure must not open a
    // second one.
    let s = row();
    let opened = 0;
    let resolved = 0;
    for (const ok of [false, false, true, false, false, false]) {
      const t = nextState(s, ok);
      if (t.action === "open_incident") opened++;
      if (t.action === "resolve_incident") resolved++;
      s = { ...s, ...t, open_incident_id: opened > resolved ? "inc-1" : null };
    }
    expect(s.state).toBe("down");
    expect([opened, resolved]).toEqual([1, 0]);
  });

  it("requires two clean passes before resolving, then resolves once", () => {
    // A monitor that is down has had its success streak reset by the failures
    // that took it down — that is what makes the first recovery a fresh streak.
    let s = row({
      state: "down",
      consecutive_failures: 4,
      consecutive_successes: 0,
      open_incident_id: "inc-1",
    });
    const first = nextState(s, true);
    expect(first.state).toBe("down");
    expect(first.action).toBe("none");

    s = { ...s, ...first };
    const second = nextState(s, true);
    expect(second.state).toBe("up");
    expect(second.action).toBe("resolve_incident");
  });

  it("suppresses the incident during maintenance but still records the state", () => {
    let s = row();
    for (let i = 0; i < CONFIRM_FAILURES; i++) {
      s = { ...s, ...nextState(s, false, { inMaintenance: true }) };
    }
    expect(s.state).toBe("down");
    expect(nextState(s, false, { inMaintenance: true }).action).toBe("none");
  });

  it("brings a brand-new monitor up on its first successful check", () => {
    const t = nextState(row({ state: "unknown", consecutive_successes: 0 }), true);
    expect(t.state).toBe("up");
    expect(t.action).toBe("none");
  });
});
