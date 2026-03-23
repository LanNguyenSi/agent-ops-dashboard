"use client";

import { useEffect, useState } from "react";
import { AlertCard } from "./AlertCard";
import type { Alert, AlertStats } from "@/lib/alerts/types";

export function AlertList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch("/api/alerts?includeStats=true");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch alerts");
        }

        setAlerts(data.alerts || []);
        setStats(data.stats || null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Loading alerts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Error: {error}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        No alerts found. All systems operational! ✅
      </div>
    );
  }

  return (
    <div>
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.acknowledged}</div>
            <div className="text-sm text-gray-600">Acknowledged</div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-600">Resolved</div>
          </div>
        </div>
      )}

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
