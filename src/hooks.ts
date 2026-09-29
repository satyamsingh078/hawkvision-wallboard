import { useEffect, useRef, useState } from "react";

/** True for `ms` after `value` changes (not on first render). */
export function useFlash(value: unknown, ms = 1000): boolean {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return on;
}

/** IDs that appeared after the first load; each stays "fresh" for `ms`. */
export function useFreshIds(ids: string[], ms = 8000): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const key = ids.join("|");
  useEffect(() => {
    if (!seen.current) { if (ids.length) seen.current = new Set(ids); return; }
    const known = seen.current;
    const added = ids.filter((i) => !known.has(i));
    if (!added.length) return;
    added.forEach((i) => known.add(i));
    setFresh((p) => new Set([...p, ...added]));
    setTimeout(() => setFresh((p) => { const n = new Set(p); added.forEach((i) => n.delete(i)); return n; }), ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return fresh;
}

export function useClock(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

/** True below `bp`px wide; used to simplify chart axes / legends on small screens. */
export function useMediaQuery(bp: number): boolean {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp - 1}px)`);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [bp]);
  return match;
}
