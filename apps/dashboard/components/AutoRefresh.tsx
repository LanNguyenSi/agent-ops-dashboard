"use client";

import { useState, useEffect } from "react";
import {
  getAutoRefreshEnabled,
  setAutoRefreshEnabled,
  getStoredInterval,
  setStoredInterval,
} from "@/lib/polling/config";
import { POLLING_INTERVALS, type PollingInterval } from "@/lib/polling/types";

interface AutoRefreshProps {
  onIntervalChange?: (interval: PollingInterval) => void;
  onEnabledChange?: (enabled: boolean) => void;
}

export function AutoRefresh({ onIntervalChange, onEnabledChange }: AutoRefreshProps) {
  const [enabled, setEnabled] = useState(true);
  const [interval, setInterval] = useState<PollingInterval>(POLLING_INTERVALS.NORMAL);

  useEffect(() => {
    setEnabled(getAutoRefreshEnabled());
    setInterval(getStoredInterval());
  }, []);

  const handleToggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    setAutoRefreshEnabled(newEnabled);
    onEnabledChange?.(newEnabled);
  };

  const handleIntervalChange = (newInterval: PollingInterval) => {
    setInterval(newInterval);
    setStoredInterval(newInterval);
    onIntervalChange?.(newInterval);
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
      {/* Auto-refresh toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-gray-900">Auto-refresh</span>
      </div>

      {/* Interval selector */}
      {enabled && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Interval:</span>
          <div className="flex gap-1">
            {Object.entries(POLLING_INTERVALS).map(([label, value]) => (
              <button
                key={label}
                onClick={() => handleIntervalChange(value)}
                className={`px-3 py-1 text-xs rounded ${
                  interval === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } transition-colors`}
              >
                {value / 1000}s
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
