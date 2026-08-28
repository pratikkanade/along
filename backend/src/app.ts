import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { config } from "./config.js";
import { ApiError } from "./errors.js";
import { healthRoutes } from "./routes/health.js";
import { hexRoutes } from "./routes/hex.js";
import { intentRoutes } from "./routes/intents.js";
import { matchRoutes } from "./routes/matches.js";

export async function buildApp() {
  const app = Fastify({ logger: true, bodyLimit: 64 * 1024 });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed"), false);
    },
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "validation_error", message: "Request validation failed", details: error.issues },
      });
    }
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    app.log.error(error);
    return reply.code(500).send({
      error: { code: "internal_error", message: "The backend could not complete the request" },
    });
  });

  await app.register(healthRoutes);
  await app.register(intentRoutes);
  await app.register(matchRoutes);
  await app.register(hexRoutes);

  return app;
}
