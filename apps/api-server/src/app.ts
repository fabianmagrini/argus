import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import { createRouter } from "./routes/index.js";

/**
 * Create and configure the Express application.
 *
 * Accepts an optional `db` override so integration tests can inject a mock
 * database without needing a real PostgreSQL connection.
 *
 * @param db - Optional Drizzle db client; when omitted, the real client from
 *             `@argus/db` is used.
 */
export function createApp(db?: Parameters<typeof createRouter>[0]): Express {
  const app: Express = express();

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createRouter(db));

  return app;
}
