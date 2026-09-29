// Tiny mock API: serves the raw file on every request so edits (and broken JSON) show up on the next poll.
import http from "node:http";
import { readFile } from "node:fs/promises";
const FILE = new URL("../data/dashboard.json", import.meta.url);
http.createServer(async (req, res) => {
  if (req.url?.startsWith("/api/dashboard")) {
    try {
      const body = await readFile(FILE, "utf8");
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(body);
    } catch { res.writeHead(500).end("cannot read data file"); }
  } else res.writeHead(404).end();
}).listen(3001, () => console.log("mock API on :3001 -> data/dashboard.json"));
