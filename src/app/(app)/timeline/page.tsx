"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const STORAGE_ORDER_KEY = "annua-cycle-order";
const STORAGE_SELECTION_KEY = "annua-cycle-selection";
const MAX_SELECTED_CYCLES = 2;

export default function TimelinePage() {
  const [reviewCycles, setReviewCycles] = useState<FullReviewCycle[]>([]);
  const [clients, setClients] = useState<FullClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [checklistClientId, setChecklistClientId] = useState<string | null>(null);

  // ── Cycle ordering (drag-and-drop, persisted to localStorage) ─────────────
  const [cycleOrder, setCycleOrder] = useState<string[]>([]);
  const orderInitialized = useRef(false);

  // Load saved order and selection once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ORDER_KEY);
      if (raw) setCycleOrder(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const rawSel = localStorage.getItem(STORAGE_SELECTION_KEY);
      if (rawSel) setSelectedCycleIds(JSON.parse(rawSel));
    } catch { /* ignore */ }
    orderInitialized.current = true;
  }, []);

  // Persist selection whenever it changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_SELECTION_KEY, JSON.stringify(selectedCycleIds)); } catch { /* ignore */ }
  }, [selectedCycleIds]);

  // Merge saved order with live DB cycles: honour stored sequence, append new ones
  const orderedCycles = useMemo<FullReviewCycle[]>(() => {
    if (reviewCycles.length === 0) return [];
    const existingIds = new Set(reviewCycles.map((rc) => rc.id));
    const known = cycleOrder.filter((id) => existingIds.has(id));
    const novel = reviewCycles.filter((rc) => !cycleOrder.includes(rc.id));
    return [
      ...known.map((id) => reviewCycles.find((rc) => rc.id === id)!),
      ...novel,
    ];
  }, [reviewCycles, cycleOrder]);

  function saveOrder(newOrder: string[]) {
    setCycleOrder(newOrder);
    try { localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(newOrder)); } catch { /* ignore */ }
  }

  // ── Drag-and-drop state ────────────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Suppress the default ghost image opacity flash
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 12, 12);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragId && dragId !== id) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { cleanup(); return; }
    const ids = orderedCycles.map((rc) => rc.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) { cleanup(); return; }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    saveOrder(next);
    cleanup();
  }

  function handleDragEnd() { cleanup(); }

  function cleanup() {
    setDragId(null);
    setDragOverId(null);
  }

  // ── Data loading ───────────────────────────────────────────────────────────
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
      // Restore saved selection, filtering out deleted cycles; default to first 2
      setSelectedCycleIds((prev) => {
        const valid = prev.filter((id) => cycles.some((c: FullReviewCycle) => c.id === id));
        if (valid.length === 0 && cycles.length > 0) {
          return cycles.slice(0, MAX_SELECTED_CYCLES).map((c: FullReviewCycle) => c.id);
        }
        return valid;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleCycle(id: string) {
    setSelectedCycleIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED_CYCLES) {
        // Drop the oldest (first) selection and add the new one
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }

  const detailClient = clients.find((c) => c.id === detailClientId) ?? null;
  const checklistClient = clients.find((c) => c.id === checklistClientId) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-w-lg whitespace-pre-wrap break-all">{error}</pre>
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
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No touchpoint cycles yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Go to Manage to create your first touchpoint cycle and add clients.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar: timeline filter + reorder ── */}
      <div className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
            Select timelines to display
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            Select up to 2 · drag to reorder
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {orderedCycles.map((rc) => {
            const count = clients.filter((c) => c.reviewCycleId === rc.id).length;
            const active = selectedCycleIds.includes(rc.id);
            const isDragging = dragId === rc.id;
            const isDropTarget = dragOverId === rc.id;

            return (
              <div
                key={rc.id}
                draggable
                onDragStart={(e) => handleDragStart(e, rc.id)}
                onDragOver={(e) => handleDragOver(e, rc.id)}
                onDrop={(e) => handleDrop(e, rc.id)}
                onDragEnd={handleDragEnd}
                className={`group relative rounded-lg transition-all ${
                  isDragging ? "opacity-40" : "opacity-100"
                } ${isDropTarget ? "border-t-2 border-indigo-500 pt-0.5" : ""}`}
              >
                <button
                  onClick={() => toggleCycle(rc.id)}
                  className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-xs transition-colors ${
                    active
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {/* Drag handle */}
                  <span
                    className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500"
                    onMouseDown={(e) => e.stopPropagation()} // prevent button click when grabbing handle
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </span>

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

                  {/* Label */}
                  <div className="text-left min-w-0">
                    <p className="truncate font-medium">{rc.name}</p>
                    <p className={`text-[10px] mt-0.5 ${active ? "text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                      {count} client{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main timeline ── */}
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        <MultiTimeline
          reviewCycles={orderedCycles}
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
