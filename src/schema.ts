import { z } from "zod";

// One schema per top-level key, so a bad section only breaks its own widget.
export const schemas = {
  meta: z.object({ title: z.string(), version: z.number(), updatedAt: z.string() }),
  kpis: z.array(z.object({
    id: z.string(), label: z.string(), value: z.number(),
    changePct: z.number().optional(), total: z.number().optional(), period: z.string().optional(),
  })),
  sites: z.array(z.object({ id: z.string(), name: z.string(), status: z.enum(["online", "offline"]) })),
  incidentTrend: z.array(z.object({ date: z.string() }).catchall(z.number())),
  incidentsByUseCase: z.array(z.object({ useCase: z.string(), count: z.number() })),
  severity24h: z.object({ critical: z.number(), high: z.number(), low: z.number() }),
  siteHealth: z.object({
    siteId: z.string(),
    thresholds: z.object({ warning: z.number(), critical: z.number() }),
    points: z.array(z.object({ time: z.string(), cpu: z.number(), gpu: z.number(), memory: z.number() })),
  }),
  cameraFps: z.object({
    thresholds: z.object({ warningLow: z.number(), criticalLow: z.number() }),
    cameras: z.array(z.object({
      id: z.string(), name: z.string(), status: z.enum(["online", "offline"]), fps: z.array(z.number()),
    })),
    times: z.array(z.string()),
  }),
  latestIncidents: z.array(z.object({
    id: z.string(), time: z.string(), siteId: z.string(), camera: z.string(), type: z.string(),
    severity: z.enum(["critical", "high", "low"]),
  })),
};
export type SectionKey = keyof typeof schemas;
export type Dashboard = { [K in SectionKey]: z.infer<(typeof schemas)[K]> };
export type Severity = Dashboard["latestIncidents"][number]["severity"];
