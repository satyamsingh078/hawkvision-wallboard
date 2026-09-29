// Demo helper (optional): randomly mutates data/dashboard.json every few seconds
// so the wallboard updates itself live, without hand-editing the file.
// Run alongside the app:  npm run simulate   (in a second terminal)
import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../data/dashboard.json", import.meta.url);
const INTERVAL_MS = 4000;

const SITES = ["site-a", "site-b", "site-c"];
const CAMERAS = ["cam-1", "cam-3", "cam-5", "cam-6", "cam-8"];
const TYPES = ["Speeding", "PPE", "Man Down", "Near Miss", "Intrusion Exclusion", "Wrong Side Driving"];
const SEVERITIES = ["low", "high", "high", "critical"]; // weighted so critical is rarer
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

async function load() {
  return JSON.parse(await readFile(FILE, "utf8"));
}
async function save(data) {
  data.meta.version += 1;
  data.meta.updatedAt = new Date().toISOString();
  await writeFile(FILE, JSON.stringify(data, null, 1));
}

const actions = [
  // bump a KPI value
  (d) => {
    const k = pick(d.kpis);
    k.value = Math.max(0, Math.round(k.value * (1 + (Math.random() - 0.3) * 0.08)));
    console.log(`kpi: ${k.id} -> ${k.value}`);
  },
  // add a new incident at the top
  (d) => {
    const inc = {
      id: `inc-${Date.now()}`,
      time: new Date().toISOString(),
      siteId: pick(SITES),
      camera: pick(["Gate Entry", "Loading Bay", "Mixer Zone", "Conveyor 2"]),
      type: pick(TYPES),
      severity: pick(SEVERITIES),
    };
    d.latestIncidents.unshift(inc);
    d.latestIncidents = d.latestIncidents.slice(0, 12);
    if (inc.severity === "critical") d.kpis.find((k) => k.id === "criticalAlerts").value++;
    console.log(`incident: ${inc.severity} ${inc.type} @ ${inc.camera}`);
  },
  // flip a camera's status
  (d) => {
    const cam = pick(d.cameraFps.cameras);
    cam.status = cam.status === "online" ? "offline" : "online";
    console.log(`camera: ${cam.name} -> ${cam.status}`);
  },
  // wobble site health
  (d) => {
    const last = d.siteHealth.points.at(-1);
    ["cpu", "gpu", "memory"].forEach((k) => {
      last[k] = Math.max(5, Math.min(99, Math.round(last[k] + (Math.random() - 0.5) * 20)));
    });
    console.log(`health: cpu=${last.cpu} gpu=${last.gpu} mem=${last.memory}`);
  },
];

async function tick() {
  try {
    const d = await load();
    pick(actions)(d);
    await save(d);
  } catch (e) {
    console.error("simulate: skipped one tick (file busy or invalid):", e.message);
  }
}

console.log(`simulate: mutating data/dashboard.json every ${INTERVAL_MS / 1000}s — Ctrl+C to stop`);
setInterval(tick, INTERVAL_MS);
