// Vercel serverless function: GET /api/dashboard
// Vercel's filesystem is read-only at runtime, so instead of writing to disk
// (what server/server.mjs + simulate.mjs do locally), this computes a
// slightly-different snapshot on every request, deterministically derived
// from the current time. No writes, no shared state between invocations —
// just works within Vercel's model, and still looks "live" on each poll.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "dashboard.json"), "utf8"));

const SITES = ["site-a", "site-b", "site-c"];
const CAMERA_NAMES = ["Gate Entry", "Loading Bay", "Mixer Zone", "Conveyor 2"];
const TYPES = ["Speeding", "PPE", "Man Down", "Near Miss", "Intrusion Exclusion", "Wrong Side Driving"];
const SEVERITIES = ["low", "high", "high", "critical"];

// small seeded PRNG so results are stable within the same second, varied across seconds
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

export default function handler(req, res) {
  const now = new Date();
  const tick = Math.floor(now.getTime() / 4000); // new "state" every 4s, like the local simulator
  const rand = rng(tick);
  const data = JSON.parse(JSON.stringify(base)); // deep clone, never mutate the import

  data.meta.version = tick;
  data.meta.updatedAt = now.toISOString();

  // wobble KPIs
  data.kpis = data.kpis.map((k) => ({
    ...k,
    value: Math.max(0, Math.round(k.value * (1 + (rand() - 0.45) * 0.05))),
  }));

  // occasionally prepend a synthetic incident (deterministic per tick)
  if (rand() < 0.5) {
    const sev = pick(rand, SEVERITIES);
    data.latestIncidents = [
      {
        id: `inc-sim-${tick}`,
        time: now.toISOString(),
        siteId: pick(rand, SITES),
        camera: pick(rand, CAMERA_NAMES),
        type: pick(rand, TYPES),
        severity: sev,
      },
      ...data.latestIncidents,
    ].slice(0, 12);
  }

  // wobble the latest site-health point
  const last = data.siteHealth.points[data.siteHealth.points.length - 1];
  last.cpu = Math.max(5, Math.min(99, Math.round(last.cpu + (rand() - 0.5) * 15)));
  last.gpu = Math.max(5, Math.min(99, Math.round(last.gpu + (rand() - 0.5) * 15)));
  last.memory = Math.max(5, Math.min(99, Math.round(last.memory + (rand() - 0.5) * 15)));

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(data);
}
