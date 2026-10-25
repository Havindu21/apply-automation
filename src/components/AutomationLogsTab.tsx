"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Activity, Play, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";

interface JobLog {
  id: string;
  jobType: string;
  status: string;
  source?: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

interface AutomationLogsTabProps {
  onTriggerDiscovery: () => Promise<void>;
  isTriggering: boolean;
}

export function AutomationLogsTab({ onTriggerDiscovery, isTriggering }: AutomationLogsTabProps) {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/automation/logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/automation/logs")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success) {
          setLogs(data.logs || []);
        }
      })
      .catch((err) => console.error("Failed to fetch logs:", err))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Automation Center & Run History</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Durable background execution logs powered by pg-boss in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onTriggerDiscovery}
            disabled={isTriggering}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow"
          >
            <Play className="w-4 h-4 fill-white" />
            {isTriggering ? "Queueing Run..." : "Trigger Discovery Now"}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60 text-zinc-500 font-semibold">
                <th className="py-3.5 px-4">Job Type</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Processed / Succeeded</th>
                <th className="py-3.5 px-4">Started</th>
                <th className="py-3.5 px-4">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No execution logs recorded yet. Trigger a run above to start.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                      {log.jobType}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                      {log.status === "running" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          <Clock className="w-3 h-3 animate-spin" /> Running
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {log.source || "all"}
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300">
                      {log.itemsProcessed} processed ({log.itemsSucceeded} succeeded)
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                      {new Date(log.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                      {log.completedAt ? new Date(log.completedAt).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
