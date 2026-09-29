import type { ReactNode } from "react";

interface Props { title: string; className?: string; error?: boolean; hasData: boolean; children: ReactNode }

/** Shared panel: title, per-widget "data error" badge, and empty/error fallback. Last good data stays visible. */
export function Widget({ title, className = "", error, hasData, children }: Props) {
  return (
    <section className={`widget ${className}`}>
      <h2>{title}{error && <span className="badge-err">data error</span>}</h2>
      <div className="body">
        {hasData ? children : <div className="empty">{error ? "Data error – check the source" : "Waiting for data…"}</div>}
      </div>
    </section>
  );
}
