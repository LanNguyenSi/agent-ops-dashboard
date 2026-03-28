import type { FastifyInstance } from "fastify";
import { PutStateSchema, CasStateSchema } from "./state.schema.js";
import * as stateService from "./state.service.js";

export function registerStateRoutes(fastify: FastifyInstance): void {
  // GET /api/state/:namespace — list all keys in namespace
  fastify.get(
    "/api/state/:namespace",
    async (req: any, reply: any) => {
      const { namespace } = req.params as { namespace: string };
      const keys = await stateService.listNamespace(namespace);
      return reply.send({ namespace, count: keys.length, keys });
    }
  );

  // GET /api/state/:namespace/:key — get single entry
  fastify.get(
    "/api/state/:namespace/:key",
    async (req: any, reply: any) => {
      const { namespace, key } = req.params as { namespace: string; key: string };
      const entry = await stateService.getState(namespace, key);
      if (!entry) {
        return reply.code(404).send({ error: "NOT_FOUND", namespace, key });
      }
      return reply.send(entry);
    }
  );

  // PUT /api/state/:namespace/:key — create or update
  fastify.put(
    "/api/state/:namespace/:key",
    async (req: any, reply: any) => {
      const { namespace, key } = req.params as { namespace: string; key: string };
      const parsed = PutStateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const { value, updatedBy } = parsed.data;
      const entry = await stateService.setState(namespace, key, value, updatedBy);
      return reply.send(entry);
    }
  );

  // DELETE /api/state/:namespace/:key — delete entry
  fastify.delete(
    "/api/state/:namespace/:key",
    async (req: any, reply: any) => {
      const { namespace, key } = req.params as { namespace: string; key: string };
      const deleted = await stateService.deleteState(namespace, key);
      if (!deleted) {
        return reply.code(404).send({ error: "NOT_FOUND", namespace, key });
      }
      return reply.code(204).send();
    }
  );

  // POST /api/state/:namespace/:key/cas — atomic compare-and-swap
  fastify.post(
    "/api/state/:namespace/:key/cas",
    async (req: any, reply: any) => {
      const { namespace, key } = req.params as { namespace: string; key: string };
      const parsed = CasStateSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        });
      }
      const { expectedVersion, value, updatedBy } = parsed.data;
      const result = await stateService.casState(
        namespace,
        key,
        expectedVersion,
        value,
        updatedBy
      );

      if (result.ok) {
        return reply.send(result.entry);
      }
      if (result.reason === "not_found") {
        return reply.code(404).send({ error: "NOT_FOUND", namespace, key });
      }
      return reply.code(409).send({
        error: "CAS_CONFLICT",
        expectedVersion: result.expectedVersion,
        actualVersion: result.actualVersion,
        message: "Version mismatch. The state was modified by another writer.",
      });
    }
  );
}
