import { useEffect, useState } from "react";
import { schemas, type Dashboard, type SectionKey } from "./schema";

export type Status = "live" | "reconnecting" | "offline";
export interface State {
  data: Partial<Dashboard>;
  errors: Partial<Record<SectionKey, true>>;
  status: Status;
  lastOk?: Date;
}
const KEYS = Object.keys(schemas) as SectionKey[];

/** Polls the JSON source. Each section is validated on its own; on failure the last good value is kept. */
export function useDashboard(url = "/api/dashboard", intervalMs = 5000): State {
  const [state, setState] = useState<State>({ data: {}, errors: {}, status: "reconnecting" });

  useEffect(() => {
    let fails = 0;
    const tick = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw: unknown = JSON.parse(await res.text());
        if (typeof raw !== "object" || raw === null) throw new Error("root is not an object");
        const obj = raw as Record<string, unknown>;
        fails = 0;
        setState((prev) => {
          const data: Partial<Dashboard> = { ...prev.data };
          const errors: State["errors"] = {};
          for (const k of KEYS) {
            const parsed = schemas[k].safeParse(obj[k]);
            if (!parsed.success) { errors[k] = true; console.error(`[wallboard] bad "${k}"`, parsed.error.issues); continue; }
            // keep the old reference when nothing changed -> no needless re-render
            if (JSON.stringify(prev.data[k]) !== JSON.stringify(parsed.data)) Object.assign(data, { [k]: parsed.data });
          }
          return { data, errors, status: "live", lastOk: new Date() };
        });
      } catch (e) {
        fails++;
        console.error("[wallboard] poll failed, keeping last data:", e);
        setState((p) => ({ ...p, status: fails >= 3 ? "offline" : "reconnecting" }));
      }
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs]);

  return state;
}
