import express, { type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The custom Express server is not a framework dev server, so load local env files explicitly.
for (const envFile of [".env.development.local", ".env.local", ".env"]) {
  const envPath = path.join(__dirname, envFile);
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}

async function startServer() {
  const { createApiApp } = await import("./src/server/app.ts");
  const app = createApiApp();
  const httpServer = createHttpServer(app);

  const portArgIdx = process.argv.indexOf("--port");
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? parseInt(process.argv[portArgIdx + 1], 10) : undefined;
  const hostArgIdx = process.argv.indexOf("--host");
  const host = hostArgIdx !== -1 && process.argv[hostArgIdx + 1] ? process.argv[hostArgIdx + 1] : "0.0.0.0";
  const primaryPort = cliPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(primaryPort, host, () => {
    console.log(`ONY server running on http://${host}:${primaryPort}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start ONY server:", error);
  process.exit(1);
});
