import "server-only";

// Limite por processo, sem prometer coordenação entre instâncias Vercel.
export function createSearchLimiter(now = Date.now) {
  const entries = new Map<string, { started: number; calls: number; active: number }>();
  return function acquire(key: string): (() => void) | null {
    const time = now();
    for (const [id, entry] of entries) if (!entry.active && time - entry.started >= 60_000) entries.delete(id);
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= 1000) return null;
      entry = { started: time, calls: 0, active: 0 }; entries.set(key, entry);
    }
    if (time - entry.started >= 60_000) { entry.calls = 0; entry.started = time; }
    if (entry.active >= 2 || entry.calls >= 60) return null;
    entry.calls++; entry.active++;
    let released = false;
    return () => { if (!released) { released = true; entry.active--; } };
  };
}
