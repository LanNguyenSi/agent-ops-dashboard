"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PipelineTrends } from "@/lib/pipeline/types";

export function PipelineChart() {
  const [trends, setTrends] = useState<PipelineTrends | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        setLoading(true);
        const response = await fetch(`/api/pipeline/trends?period=${period}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch trends");
        }

        setTrends(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-600">Loading trends...</div>
      </div>
    );
  }

  if (error || !trends) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Error: {error || "No data"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pipeline Trends</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("7d")}
            className={`px-3 py-1 text-sm rounded ${
              period === "7d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`px-3 py-1 text-sm rounded ${
              period === "30d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setPeriod("90d")}
            className={`px-3 py-1 text-sm rounded ${
              period === "90d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{trends.stats.totalRuns}</div>
          <div className="text-sm text-gray-600">Total Runs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{trends.stats.successRuns}</div>
          <div className="text-sm text-gray-600">Success</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{trends.stats.failureRuns}</div>
          <div className="text-sm text-gray-600">Failure</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{trends.stats.successRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trends.dataPoints}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="success"
            stroke="#22c55e"
            strokeWidth={2}
            name="Success"
          />
          <Line
            type="monotone"
            dataKey="failure"
            stroke="#ef4444"
            strokeWidth={2}
            name="Failure"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
