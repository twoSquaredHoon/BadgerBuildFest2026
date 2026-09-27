import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { readLivePrices } from "./live-prices.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8787);

function loadEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".mjs": "text/javascript" };
let cache = null;
let cachedAt = 0;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/prices" && request.method === "POST") {
    if (!cache || Date.now() - cachedAt > 15 * 60 * 1000) {
      cache = await readLivePrices();
      cachedAt = Date.now();
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(cache));
    return;
  }
  const relative = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  const name = relative.split(/[/\\]/).filter(Boolean).pop();
  const path = join(root, !name ? "index.html" : relative);
  if (!path.startsWith(root) || (name && name.startsWith(".")) || !existsSync(path)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" });
  response.end(readFileSync(path));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`PawPlan http://127.0.0.1:${port}`);
});
