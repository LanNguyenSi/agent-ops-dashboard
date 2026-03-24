export interface PollConfig {
  interval: number; // milliseconds
  enabled: boolean;
  onError?: (error: Error) => void;
}

export interface PollState {
  isPolling: boolean;
  lastUpdate: Date | null;
  error: Error | null;
}

export type PollingInterval = 5000 | 10000 | 30000 | 60000; // 5s, 10s, 30s, 60s

export const POLLING_INTERVALS: Record<string, PollingInterval> = {
  FAST: 5000,
  NORMAL: 10000,
  SLOW: 30000,
  VERY_SLOW: 60000,
};
