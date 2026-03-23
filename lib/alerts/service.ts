import type { Alert, AlertStats } from "./types";
import { getMockAlerts, getAlertStats } from "./mock-data";

export async function getAlerts(): Promise<Alert[]> {
  // For MVP, return mock data
  // In production, fetch from database with Prisma
  return getMockAlerts();
}

export async function getStats(): Promise<AlertStats> {
  return getAlertStats();
}

export async function getAlert(id: string): Promise<Alert | null> {
  const alerts = await getAlerts();
  return alerts.find((a) => a.id === id) || null;
}

// TODO: Implement with Prisma for production
export async function acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert | null> {
  console.log(`Mock: Acknowledge alert ${id} by ${acknowledgedBy}`);
  return null;
}

export async function resolveAlert(id: string): Promise<Alert | null> {
  console.log(`Mock: Resolve alert ${id}`);
  return null;
}
