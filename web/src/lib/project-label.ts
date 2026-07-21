/**
 * Projects reuse generic names across clients ("Website", "Social Media Marketing"),
 * so a project name alone is ambiguous. We prefix each one with a short client code
 * derived from the client name — no schema change needed.
 */

const STOP_WORDS = new Set(["and", "the", "of", "for", "pvt", "ltd", "llp", "inc", "co"]);

function words(name: string): string[] {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()));
}

/** Base code: initials for multi-word names ("Acme Retail" → "AR"), else a prefix ("Zoho" → "ZOH"). */
export function clientCode(name: string): string {
  const parts = words(name);
  if (parts.length === 0) return name.slice(0, 3).toUpperCase() || "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/**
 * Codes for a set of clients, made unique — a collision grows the code with more
 * letters from the client name, then falls back to a numeric suffix.
 */
export function buildClientCodes(clients: { id: string; name: string }[]): Record<string, string> {
  const taken = new Set<string>();
  const codes: Record<string, string> = {};

  for (const c of [...clients].sort((a, b) => a.name.localeCompare(b.name))) {
    const letters = words(c.name).join("").toUpperCase();
    let code = clientCode(c.name);
    for (let len = code.length + 1; taken.has(code) && len <= letters.length; len++) {
      code = letters.slice(0, len);
    }
    for (let n = 2; taken.has(code); n++) code = `${clientCode(c.name)}${n}`;
    taken.add(code);
    codes[c.id] = code;
  }

  return codes;
}

/** "AR · Website" — the label to show anywhere a project is listed or picked. */
export function projectLabel(projectName: string, code: string | null | undefined): string {
  return code ? `${code} · ${projectName}` : projectName;
}
