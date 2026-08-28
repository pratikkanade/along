import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createIntent } from "../services/intents.js";

const bodySchema = z
  .object({
    intent_id: z.uuid().optional(),
    user_id: z.uuid(),
    raw_text: z.string().trim().min(1).max(1000),
    activity_key: z.string().trim().min(1).max(100).optional(),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    window_start: z.iso.datetime({ offset: true }),
    window_end: z.iso.datetime({ offset: true }),
  })
  .superRefine((body, context) => {
    const start = new Date(body.window_start);
    const end = new Date(body.window_end);
    if (end <= start) {
      context.addIssue({ code: "custom", path: ["window_end"], message: "must be after window_start" });
    }
    if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
      context.addIssue({ code: "custom", path: ["window_end"], message: "window cannot exceed 24 hours" });
    }
  });

export async function intentRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/intents", async (request, reply) => {
    const body = bodySchema.parse(request.body);
    const intent = await createIntent({
      userId: body.user_id,
      rawText: body.raw_text,
      lat: body.lat,
      lon: body.lon,
      windowStart: new Date(body.window_start),
      windowEnd: new Date(body.window_end),
      ...(body.intent_id ? { intentId: body.intent_id } : {}),
      ...(body.activity_key ? { activityKey: body.activity_key } : {}),
    });
    return reply.code(201).send({ data: intent });
  });
}
