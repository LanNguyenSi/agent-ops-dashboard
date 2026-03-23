import { POLLING_INTERVALS, type PollingInterval } from "./types";

// Default polling interval
export const DEFAULT_INTERVAL: PollingInterval = POLLING_INTERVALS.NORMAL; // 10s

// Backoff configuration
export const BACKOFF_CONFIG = {
  initialDelay: 1000, // 1s
  maxDelay: 60000, // 60s
  multiplier: 2,
};

// Get polling interval from localStorage or default
export function getStoredInterval(): PollingInterval {
  if (typeof window === "undefined") return DEFAULT_INTERVAL;
  
  const stored = localStorage.getItem("polling_interval");
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (Object.values(POLLING_INTERVALS).includes(parsed as PollingInterval)) {
      return parsed as PollingInterval;
    }
  }
  
  return DEFAULT_INTERVAL;
}

// Store polling interval in localStorage
export function setStoredInterval(interval: PollingInterval): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("polling_interval", interval.toString());
}

// Get auto-refresh enabled state
export function getAutoRefreshEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("auto_refresh_enabled");
  return stored === null || stored === "true";
}

// Set auto-refresh enabled state
export function setAutoRefreshEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auto_refresh_enabled", enabled.toString());
}
