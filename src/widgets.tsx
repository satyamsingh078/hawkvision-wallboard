import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Dashboard, Severity } from "./schema";
import { useFlash } from "./hooks";

// Industrial control-room palette: charcoal panels, safety-amber accent, signal colors for status.
export const COLORS = { crit: "#e8483f", high: "#f0a83c", low: "#4fb87a", accent: "#f0a83c", muted: "#93a0ad", grid: "#33393f" };
const SERIES = ["#5aa8d1", "#f0a83c", "#4fb87a", "#c97fd1", "#e8483f", "#8fc4e0"];
const SEV_COLOR: Record<Severity, string> = { critical: COLORS.crit, high: COLORS.high, low: COLORS.low };
const tick = { fill: "#9aa5b1", fontSize: 15, fontFamily: "IBM Plex Mono" };
const tip = { contentStyle: { background: "#1b1e23", border: "1px solid #3a4046", fontSize: 15, fontFamily: "IBM Plex Sans" }, labelStyle: { color: "#eef1f4" } };
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });
export const hhmmss = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "--:--:--" : d.toLocaleTimeString("en-GB", { hour12: false });
};

// ---- KPI tile
export function KpiTile({ kpi, pulse, error }: { kpi: Dashboard["kpis"][number]; pulse?: boolean; error?: boolean }) {
  const flash = useFlash(kpi.value);
  const up = (kpi.changePct ?? 0) >= 0;
  return (
    <div className={`kpi ${flash ? "flash" : ""} ${pulse ? "pulse-red" : ""}`}>
      <div className="kpi-plate">{kpi.label}{error && <span className="badge-err">data error</span>}</div>
      <div className="kpi-value">
        {fmt(kpi.value)}{kpi.total !== undefined && <span className="kpi-total"> / {fmt(kpi.total)}</span>}
      </div>
      {kpi.changePct !== undefined && (
        <div className={`kpi-change ${up ? "up" : "down"}`}>
          {up ? "▲" : "▼"} {Math.abs(kpi.changePct).toFixed(1)}% <span>vs prev {kpi.period}</span>
        </div>
      )}
    </div>
  );
}

// ---- Incident trend (one series per site)
export function TrendChart({ rows, sites, compact }: { rows: Dashboard["incidentTrend"]; sites: Dashboard["sites"]; compact?: boolean }) {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => k !== "date")))];
  const name = (k: string) => sites.find((s) => s.id === k)?.name ?? k;
  return (
    <ResponsiveContainer>
      <AreaChart data={rows} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ ...tick, fontSize: compact ? 12 : 15 }} tickFormatter={(d: string) => d.slice(5)} interval={compact ? "preserveStartEnd" : 0} minTickGap={compact ? 24 : 0} />
        <YAxis tick={tick} tickFormatter={fmt} width={64} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: compact ? 12 : 15, fontFamily: "IBM Plex Sans" }} />
        {keys.map((k, i) => (
          <Area key={k} dataKey={k} name={name(k)} type="monotone" stroke={SERIES[i % SERIES.length]}
            fill={SERIES[i % SERIES.length]} fillOpacity={0.16} strokeWidth={2.5} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Use cases: hide zeros, sort desc
export function UseCaseChart({ rows }: { rows: Dashboard["incidentsByUseCase"] }) {
  const data = rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 48, left: 8, bottom: 0 }} barCategoryGap="28%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="useCase" tick={{ ...tick, fontFamily: "IBM Plex Sans", fontSize: 16 }} width={170} axisLine={false} tickLine={false} />
        <Tooltip {...tip} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="count" fill={COLORS.accent} radius={[0, 2, 2, 0]} maxBarSize={28}>
          <LabelList dataKey="count" position="right" fill="#eef1f4" fontSize={16} fontFamily="IBM Plex Mono" formatter={fmt} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Severity donut with total in the centre
export function SeverityChart({ sev }: { sev: Dashboard["severity24h"] }) {
  const data = (["critical", "high", "low"] as const).map((k) => ({ name: k, value: sev[k] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="92%" stroke="none" paddingAngle={2}>
              {data.map((d) => <Cell key={d.name} fill={SEV_COLOR[d.name]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center"><b>{fmt(total)}</b><span>incidents</span></div>
      </div>
      <ul className="donut-legend">
        {data.map((d) => <li key={d.name}><i style={{ background: SEV_COLOR[d.name] }} />{d.name}<b>{fmt(d.value)}</b></li>)}
      </ul>
    </div>
  );
}

// ---- Site health with threshold lines
export function HealthChart({ h, compact }: { h: Dashboard["siteHealth"]; compact?: boolean }) {
  const data = h.points.map((p) => ({ ...p, t: hhmmss(p.time).slice(0, 5) }));
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="t" tick={{ ...tick, fontSize: compact ? 12 : 15 }} interval={compact ? "preserveStartEnd" : 0} />
        <YAxis domain={[0, 100]} tick={{ ...tick, fontSize: compact ? 12 : 15 }} unit="%" width={compact ? 40 : 54} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 15, fontFamily: "IBM Plex Sans" }} />
        <ReferenceLine y={h.thresholds.warning} stroke={COLORS.high} strokeDasharray="6 5" />
        <ReferenceLine y={h.thresholds.critical} stroke={COLORS.crit} strokeDasharray="6 5" />
        <Line dataKey="cpu" name="CPU" stroke="#5aa8d1" strokeWidth={2.5} dot={false} />
        <Line dataKey="gpu" name="GPU" stroke="#c97fd1" strokeWidth={2.5} dot={false} />
        <Line dataKey="memory" name="Memory" stroke="#4fb87a" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---- Camera FPS; offline cameras are grey, dashed and struck through in the legend
export function FpsChart({ f, compact }: { f: Dashboard["cameraFps"]; compact?: boolean }) {
  const data = f.times.map((t, i) => {
    const row: Record<string, string | number> = { t };
    f.cameras.forEach((c) => { const v = c.fps[i]; if (v !== undefined) row[c.id] = v; });
    return row;
  });
  const offline = new Set(f.cameras.filter((c) => c.status === "offline").map((c) => c.name));
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="t" tick={{ ...tick, fontSize: compact ? 12 : 15 }} interval={compact ? "preserveStartEnd" : 0} />
        <YAxis domain={[0, 20]} tick={{ ...tick, fontSize: compact ? 12 : 15 }} width={compact ? 32 : 44} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 14, fontFamily: "IBM Plex Sans" }}
          formatter={(v: string) => offline.has(v)
            ? <span style={{ color: "#6a7178", textDecoration: "line-through" }}>{v} (offline)</span>
            : <span style={{ color: "#9aa5b1" }}>{v}</span>} />
        <ReferenceLine y={f.thresholds.warningLow} stroke={COLORS.high} strokeDasharray="6 5" />
        <ReferenceLine y={f.thresholds.criticalLow} stroke={COLORS.crit} strokeDasharray="6 5" />
        {f.cameras.map((c, i) => (
          <Line key={c.id} dataKey={c.id} name={c.name} dot={false} strokeWidth={c.status === "offline" ? 1.5 : 2.5}
            stroke={c.status === "offline" ? "#565c62" : SERIES[i % SERIES.length]}
            strokeDasharray={c.status === "offline" ? "2 4" : undefined} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---- Ticker: newest first, CSS marquee when the list is long
export function Ticker({ items, sites, fresh }: { items: Dashboard["latestIncidents"]; sites: Dashboard["sites"]; fresh: Set<string> }) {
  const scroll = items.length > 5;
  const rows = scroll ? [...items, ...items] : items;
  return (
    <div className="ticker">
      <div className={scroll ? "ticker-track" : ""} style={scroll ? { animationDuration: `${items.length * 3}s` } : undefined}>
        {rows.map((i, n) => (
          <div key={`${i.id}-${n}`} className={`row ${fresh.has(i.id) ? "fresh" : ""} ${fresh.has(i.id) && i.severity === "critical" ? "fresh-crit" : ""}`}>
            <span className="t">{hhmmss(i.time)}</span>
            <span>{sites.find((s) => s.id === i.siteId)?.name ?? i.siteId}</span>
            <span>{i.camera}</span>
            <span className="type">{i.type}</span>
            <span className={`sev sev-${i.severity}`}>{i.severity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
