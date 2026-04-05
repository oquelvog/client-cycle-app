"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewCycle, Client, Milestone, Task, CheckIn } from "@/types";
import { MultiTimeline } from "@/components/timeline/MultiTimeline";
import { HouseholdDetailPanel } from "@/components/panels/HouseholdDetailPanel";
import { TaskChecklistPanel } from "@/components/panels/TaskChecklistPanel";

type FullReviewCycle = ReviewCycle & {
  milestones: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] })[];
};

type FullClient = Client & {
  reviewCycle: ReviewCycle;
  currentMilestone: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] }) | null;
};

export default function TimelinePage() {
  const [reviewCycles, setReviewCycles] = useState<FullReviewCycle[]>([]);
  const [clients, setClients] = useState<FullClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [checklistClientId, setChecklistClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/data");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { reviewCycles: cycles, clients: cls } = await res.json();
      setReviewCycles(cycles);
      setClients(cls);
      // Select all cycles by default on first load
      setSelectedCycleIds((prev) =>
        prev.length === 0 && cycles.length > 0 ? cycles.map((c: FullReviewCycle) => c.id) : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const detailClient = clients.find((c) => c.id === detailClientId) ?? null;
  const checklistClient = clients.find((c) => c.id === checklistClientId) ?? null;

  function toggleCycle(id: string) {
    setSelectedCycleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Loading timeline…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-red-600">Failed to load data</p>
        <pre className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-w-lg whitespace-pre-wrap break-all">{error}</pre>
        <button onClick={load} className="text-xs text-indigo-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (reviewCycles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <svg className="w-10 h-10 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No review cycles yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Go to Manage to create your first review cycle and add households.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar: timeline filter */}
      <div className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
            Select timelines to display
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Choose one or more</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {reviewCycles.map((rc) => {
            const count = clients.filter((c) => c.reviewCycleId === rc.id).length;
            const active = selectedCycleIds.includes(rc.id);
            return (
              <button
                key={rc.id}
                onClick={() => toggleCycle(rc.id)}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {/* Checkbox indicator */}
                <span
                  className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    active
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {active && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="text-left min-w-0">
                  <p className="truncate font-medium">{rc.name}</p>
                  <p className={`text-[10px] mt-0.5 ${active ? "text-indigo-400 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {count} household{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main timeline */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <MultiTimeline
          reviewCycles={reviewCycles}
          clients={clients}
          selectedCycleIds={selectedCycleIds}
          onOpenDetail={setDetailClientId}
          onOpenChecklist={setChecklistClientId}
          onRefresh={load}
        />
      </div>

      {detailClient && (
        <div className="w-72 shrink-0 overflow-hidden border-l border-gray-200 dark:border-gray-800">
          <HouseholdDetailPanel
            client={detailClient}
            reviewCycles={reviewCycles}
            onClose={() => setDetailClientId(null)}
            onRefresh={load}
          />
        </div>
      )}

      {checklistClient && (
        <TaskChecklistPanel
          open={!!checklistClient}
          onClose={() => { setChecklistClientId(null); load(); }}
          client={checklistClient}
          milestone={checklistClient.currentMilestone}
          allMilestones={reviewCycles.find((rc) => rc.id === checklistClient.reviewCycleId)?.milestones ?? []}
          onRefresh={load}
        />
      )}
    </div>
  );
}
