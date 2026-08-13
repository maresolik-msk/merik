// deno test supabase/functions/probe/state.test.ts
//
// The probe's state machine is the one piece of Digital Operations logic that
// decides whether a human gets woken up, so it is the piece that gets a test.
import { assertEquals } from "jsr:@std/assert@1";
import { CONFIRM_FAILURES, nextState, type StateRow } from "./state.ts";

const row = (p: Partial<StateRow> = {}): StateRow => ({
  state: "up",
  consecutive_failures: 0,
  consecutive_successes: 5,
  open_incident_id: null,
  ...p,
});

Deno.test("one failed check is never an incident", () => {
  const t = nextState(row(), false);
  assertEquals(t.state, "up");
  assertEquals(t.action, "none");
});

Deno.test("confirmed failures open exactly one incident", () => {
  let s = row();
  let opened = 0;
  for (let i = 0; i < 5; i++) {
    const t = nextState(s, false);
    if (t.action === "open_incident") opened++;
    s = { ...s, ...t, open_incident_id: opened ? "inc-1" : null };
  }
  assertEquals(s.state, "down");
  assertEquals(opened, 1);
});

Deno.test("a flapping target does not reopen incidents", () => {
  // fail, fail (down + incident), one recovery, then fail again: the single
  // success must not close the incident and the next failure must not open a
  // second one.
  let s = row();
  let opened = 0, resolved = 0;
  for (const ok of [false, false, true, false, false, false]) {
    const t = nextState(s, ok);
    if (t.action === "open_incident") opened++;
    if (t.action === "resolve_incident") resolved++;
    s = { ...s, ...t, open_incident_id: opened > resolved ? "inc-1" : null };
  }
  assertEquals(s.state, "down");
  assertEquals([opened, resolved], [1, 0]);
});

Deno.test("recovery needs two clean passes, then resolves once", () => {
  // A monitor that is down has had its success streak reset by the failures
  // that took it down — that is what makes the first recovery a fresh streak.
  let s = row({
    state: "down",
    consecutive_failures: 4,
    consecutive_successes: 0,
    open_incident_id: "inc-1",
  });
  const first = nextState(s, true);
  assertEquals(first.state, "down");
  assertEquals(first.action, "none");

  s = { ...s, ...first };
  const second = nextState(s, true);
  assertEquals(second.state, "up");
  assertEquals(second.action, "resolve_incident");
});

Deno.test("maintenance suppresses the incident but not the state", () => {
  let s = row();
  for (let i = 0; i < CONFIRM_FAILURES; i++) {
    s = { ...s, ...nextState(s, false, { inMaintenance: true }) };
  }
  assertEquals(s.state, "down");
  assertEquals(nextState(s, false, { inMaintenance: true }).action, "none");
});

Deno.test("a new monitor goes up on its first successful check", () => {
  const t = nextState(row({ state: "unknown", consecutive_successes: 0 }), true);
  assertEquals(t.state, "up");
  assertEquals(t.action, "none");
});
