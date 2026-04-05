"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewCycle, Client, Milestone, Task, CheckIn } from "@/types";
import { getReviewCycles } from "@/actions/review-cycles";
import { getClients } from "@/actions/clients";
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

  // View controls
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);

  // Panels
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [checklistClientId, setChecklistClientId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cycles, cls] = await Promise.all([getReviewCycles(), getClients()]);
    setReviewCycles(cycles as FullReviewCycle[]);
    setClients(cls as FullClient[]);
    if (selectedCycleIds.length === 0 && cycles.length > 0) {
      setSelectedCycleIds(cycles.map((c) => c.id));
    }
    setLoading(false);
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
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Loading timeline…
      </div>
    );
  }

  if (reviewCycles.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-600">No review cycles yet</p>
        <p className="text-xs text-gray-400">Go to Manage to create your first review cycle and add households.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left sidebar: cycle selector */}
      <div className="w-48 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">View</p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
              onClick={() => setViewMode("single")}
              className={`flex-1 py-1.5 font-medium transition-colors ${viewMode === "single" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Single
            </button>
            <button
              onClick={() => setViewMode("multi")}
              className={`flex-1 py-1.5 font-medium transition-colors ${viewMode === "multi" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Multi
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Review Cycles
          </p>
          {reviewCycles.map((rc) => {
            const count = clients.filter((c) => c.reviewCycleId === rc.id).length;
            const active = selectedCycleIds.includes(rc.id);
            return (
              <button
                key={rc.id}
                onClick={() => viewMode === "multi" ? toggleCycle(rc.id) : setSelectedCycleIds([rc.id])}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                  active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <p className="truncate">{rc.name}</p>
                <p className={`text-[10px] mt-0.5 ${active ? "text-indigo-400" : "text-gray-400"}`}>
                  {count} household{count !== 1 ? "s" : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main timeline area */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <MultiTimeline
          reviewCycles={reviewCycles}
          clients={clients}
          selectedCycleIds={viewMode === "single" ? selectedCycleIds.slice(0, 1) : selectedCycleIds}
          onOpenDetail={setDetailClientId}
          onOpenChecklist={setChecklistClientId}
          onRefresh={load}
        />
      </div>

      {/* Right: household detail panel */}
      {detailClient && (
        <div className="w-72 shrink-0 overflow-hidden border-l border-gray-200">
          <HouseholdDetailPanel
            client={detailClient}
            reviewCycles={reviewCycles}
            onClose={() => setDetailClientId(null)}
            onRefresh={load}
          />
        </div>
      )}

      {/* Task checklist panel (modal) */}
      {checklistClient && (
        <TaskChecklistPanel
          open={!!checklistClient}
          onClose={() => { setChecklistClientId(null); load(); }}
          client={checklistClient}
          milestone={checklistClient.currentMilestone}
          allMilestones={
            reviewCycles.find((rc) => rc.id === checklistClient.reviewCycleId)?.milestones ?? []
          }
          onRefresh={load}
        />
      )}
    </div>
  );
}
