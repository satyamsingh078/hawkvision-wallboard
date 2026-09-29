import { useRef } from "react";
import { useDashboard, type Status } from "./useDashboard";
import { useClock, useFreshIds, useMediaQuery } from "./hooks";
import { Widget } from "./Widget";
import { FpsChart, HealthChart, KpiTile, SeverityChart, Ticker, TrendChart, UseCaseChart } from "./widgets";

const POLL_MS = Number(import.meta.env.VITE_POLL_MS ?? 5000);
const STATUS_LABEL: Record<Status, string> = { live: "● LIVE", reconnecting: "Reconnecting…", offline: "Offline — showing last data" };

function Header({ title, status, lastOk }: { title: string; status: Status; lastOk?: Date }) {
  const now = useClock();
  return (
    <header>
      <div className="brand">
        <span className="brand-mark" />

        {/* <img src="/logo.png" alt="HawkVision AI" className="brand-logo" /> */}
        <h1>HAWKVISION<span>{title}</span></h1>
      </div>
      <div className="header-right">
        <span className={`status ${status}`}>{STATUS_LABEL[status]}</span>
        <span>Last update {lastOk ? lastOk.toLocaleTimeString("en-GB", { hour12: false }) : "--:--:--"}</span>
        <b className="clock">{now.toLocaleTimeString("en-GB", { hour12: false })}</b>
      </div>
    </header>
  );
}

export function App() {
  const { data: d, errors: e, status, lastOk } = useDashboard("/api/dashboard", POLL_MS);
  const compact = useMediaQuery(900);
  const fresh = useFreshIds((d.latestIncidents ?? []).map((i) => i.id));
  const critNow = (d.latestIncidents ?? []).some((i) => i.severity === "critical" && fresh.has(i.id));

  // Offline cameras count against "Cameras Online": subtract offline cameras added since first load.
  const baseline = useRef<number | null>(null);
  const offline = d.cameraFps?.cameras.filter((c) => c.status === "offline").length ?? 0;
  if (d.cameraFps && baseline.current === null) baseline.current = offline;
  const delta = offline - (baseline.current ?? offline);
  const kpis = (d.kpis ?? []).map((k) => (k.id === "camerasOnline" ? { ...k, value: Math.max(0, k.value - delta) } : k));

  return (
    <div className="app">
      <Header title={d.meta?.title ?? "Site Operations Wallboard"} status={status} lastOk={lastOk} />
      <div className="kpis">
        {kpis.length ? kpis.map((k) => <KpiTile key={k.id} kpi={k} error={e.kpis} pulse={k.id === "criticalAlerts" && critNow} />)
          : <div className="empty">{e.kpis ? "KPI data error" : "Waiting for data…"}</div>}
      </div>
      <Widget title="Incident trend" className="trend" error={e.incidentTrend} hasData={!!d.incidentTrend}>
        {d.incidentTrend && <TrendChart rows={d.incidentTrend} sites={d.sites ?? []} compact={compact} />}
      </Widget>
      <Widget title="Incidents by use case (today)" className="usecase" error={e.incidentsByUseCase} hasData={!!d.incidentsByUseCase}>
        {d.incidentsByUseCase && <UseCaseChart rows={d.incidentsByUseCase} />}
      </Widget>
      <Widget title="Severity (24h)" className="sev24" error={e.severity24h} hasData={!!d.severity24h}>
        {d.severity24h && <SeverityChart sev={d.severity24h} />}
      </Widget>
      <Widget title={`Site health – ${d.sites?.find((s) => s.id === d.siteHealth?.siteId)?.name ?? "site"}`} className="health" error={e.siteHealth} hasData={!!d.siteHealth}>
        {d.siteHealth && <HealthChart h={d.siteHealth} compact={compact} />}
      </Widget>
      <Widget title="Camera FPS" className="fps" error={e.cameraFps} hasData={!!d.cameraFps}>
        {d.cameraFps && <FpsChart f={d.cameraFps} compact={compact} />}
      </Widget>
      <Widget title="Latest incidents" className="latest" error={e.latestIncidents} hasData={!!d.latestIncidents}>
        {d.latestIncidents && <Ticker items={d.latestIncidents} sites={d.sites ?? []} fresh={fresh} />}
      </Widget>
    </div>
  );
}
