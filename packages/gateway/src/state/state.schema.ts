import { z } from "zod";

export const PutStateSchema = z.object({
  value: z.record(z.string(), z.unknown()),
  updatedBy: z.string().optional(),
});

export const CasStateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  value: z.record(z.string(), z.unknown()),
  updatedBy: z.string().optional(),
});

export type PutStateBody = z.infer<typeof PutStateSchema>;
export type CasStateBody = z.infer<typeof CasStateSchema>;

export interface StateEntry {
  id: string;
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface StateKeyInfo {
  key: string;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}
