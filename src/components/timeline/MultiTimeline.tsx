"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client, Milestone, ReviewCycle, Task, CheckIn } from "@/types";
import { Timeline } from "./Timeline";
import {
  getWindowBounds,
  getMonthBands,
  getMilestonePosition,
  dateToPx,
  today,
  isNeedsAttention,
  getDayOfYear,
  currentYear,
} from "@/lib/timeline";
import { MilestoneBlock } from "./MilestoneBlock";
import { ClientTag } from "./ClientTag";
import { NeedsAttentionGutter } from "./NeedsAttentionGutter";
import { UnassignedBand } from "./UnassignedBand";
import { AdvancementDialog } from "@/components/modals/AdvancementDialog";
import { MultiClientActionDialog } from "@/components/modals/MultiClientActionDialog";
import { advanceClient } from "@/actions/clients";
import { getLiveStats } from "@/actions/tasks";

type FullReviewCycle = ReviewCycle & {
  milestones: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] })[];
};

interface Props {
  reviewCycles: FullReviewCycle[];
  clients: Client[];
  selectedCycleIds: string[];
  onOpenDetail: (clientId: string) => void;
  onOpenChecklist: (clientId: string) => void;
  onRefresh: () => void;
}

interface PendingAdvancement {
  clientId: string;
  clientName: string;
  currentMilestoneTitle: string;
  nextMilestoneTitle: string;
}

// ── Public component ──────────────────────────────────────────────────────────

export function MultiTimeline({
  reviewCycles,
  clients,
  selectedCycleIds,
  onOpenDetail,
  onOpenChecklist,
  onRefresh,
}: Props) {
  // reviewCycles is already in drag-drop order from the parent.
  // Array.filter preserves order, so visibleCycles is also ordered correctly.
  const visibleCycles = reviewCycles.filter((rc) => selectedCycleIds.includes(rc.id));

  if (visibleCycles.length <= 1) {
    return (
      <Timeline
        reviewCycles={visibleCycles.length === 1 ? visibleCycles : reviewCycles}
        clients={clients}
        onOpenDetail={onOpenDetail}
        onOpenChecklist={onOpenChecklist}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <SharedTimelineCanvas
      visibleCycles={visibleCycles}
      clients={clients}
      onOpenDetail={onOpenDetail}
      onOpenChecklist={onOpenChecklist}
      onRefresh={onRefresh}
    />
  );
}

// ── Shared multi-column canvas ────────────────────────────────────────────────

interface SharedProps {
  visibleCycles: FullReviewCycle[];
  clients: Client[];
  onOpenDetail: (clientId: string) => void;
  onOpenChecklist: (clientId: string) => void;
  onRefresh: () => void;
}

function SharedTimelineCanvas({
  visibleCycles,
  clients,
  onOpenDetail,
  onOpenChecklist,
  onRefresh,
}: SharedProps) {
  const { windowStart, windowEnd, totalPx } = getWindowBounds();
  const monthBands = getMonthBands(windowStart, windowEnd);
  const todayPx = dateToPx(today(), windowStart);
  const yr = currentYear();
  const todayDoy = getDayOfYear(today());

  const containerRef = useRef<HTMLDivElement>(null);
  const [statsMap, setStatsMap] = useState<Record<string, { total: number; completed: number }>>({});
  const [pendingAdvancement, setPendingAdvancement] = useState<PendingAdvancement | null>(null);
  const [advancingLoading, setAdvancingLoading] = useState(false);
  const [multiActionOpen, setMultiActionOpen] = useState(false);

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = Math.max(0, todayPx - 200);
    }
  }, [todayPx]);

  // Load live stats for all clients in visible cycles
  const loadStats = useCallback(async () => {
    const entries = await Promise.all(
      clients.map(async (c) => {
        const stats = await getLiveStats(c.id, c.currentMilestoneId);
        return [c.id, stats] as const;
      })
    );
    setStatsMap(Object.fromEntries(entries));
  }, [clients]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Aggregate warning bands across all visible cycles
  const visibleCycleIds = useMemo(
    () => new Set(visibleCycles.map((rc) => rc.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCycles.map((rc) => rc.id).join(",")]
  );
  const allVisibleClients = clients.filter((c) => visibleCycleIds.has(c.reviewCycleId));

  const unassigned = allVisibleClients.filter((c) => !c.currentMilestoneId);
  const assignedClients = allVisibleClients.filter((c) => c.currentMilestoneId);

  const needsAttention = assignedClients.filter((c) => {
    if (!c.currentMilestone) return false;
    // Lagging: cycle year is behind AND the milestone window has already closed.
    if (c.cycleYear < yr && c.currentMilestone.endDayOfYear < todayDoy) return true;
    // Original logic: milestone not visible in window AND 182+ days since last occurrence.
    const pos = getMilestonePosition(
      c.currentMilestone.dayOfYear,
      c.currentMilestone.endDayOfYear,
      c.currentMilestone.durationType,
      windowStart,
      windowEnd
    );
    return !pos && isNeedsAttention(c.currentMilestone.dayOfYear);
  });
  const needsAttentionIds = new Set(needsAttention.map((c) => c.id));

  function handleAdvancementNeeded(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client || !client.currentMilestoneId) return;

    const cycle = visibleCycles.find((rc) => rc.id === client.reviewCycleId);
    if (!cycle) return;

    const milestones = cycle.milestones;
    const currentIdx = milestones.findIndex((m) => m.id === client.currentMilestoneId);
    const nextIdx = currentIdx === milestones.length - 1 ? 0 : currentIdx + 1;

    setPendingAdvancement({
      clientId,
      clientName: client.name,
      currentMilestoneTitle: milestones[currentIdx]?.title ?? "Current",
      nextMilestoneTitle: milestones[nextIdx]?.title ?? "Next",
    });
  }

  async function handleConfirmAdvancement() {
    if (!pendingAdvancement) return;
    setAdvancingLoading(true);
    try {
      await advanceClient(pendingAdvancement.clientId);
      onRefresh();
    } finally {
      setAdvancingLoading(false);
      setPendingAdvancement(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Warning bands — span all columns */}
      <div className="px-4 pt-3 space-y-0">
        <NeedsAttentionGutter
          clients={needsAttention}
          statsMap={statsMap}
          onOpenDetail={onOpenDetail}
          onOpenChecklist={onOpenChecklist}
          onAdvancementNeeded={handleAdvancementNeeded}
          onYearUpdated={onRefresh}
        />
        <UnassignedBand clients={unassigned} onOpenDetail={onOpenDetail} />
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">Rolling 12-month timeline</span>
        <button
          onClick={() => setMultiActionOpen(true)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Multi-client action
        </button>
      </div>

      {/* Per-cycle column headers */}
      <div className="flex shrink-0 border-b border-gray-100 dark:border-gray-800">
        {visibleCycles.map((cycle, i) => {
          const count = clients.filter((c) => c.reviewCycleId === cycle.id).length;
          return (
            <div
              key={cycle.id}
              className={`flex-1 min-w-0 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 ${
                i > 0 ? "border-l border-gray-200 dark:border-gray-700" : ""
              }`}
            >
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
                {cycle.name}
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {count} client{count !== 1 ? "s" : ""}
              </p>
            </div>
          );
        })}
      </div>

      {/* Shared scrollable canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative select-none"
        style={{ minHeight: 0 }}
      >
        <div className="relative mx-4" style={{ height: totalPx }}>

          {/* Month bands — span full width of all columns */}
          {monthBands.map((band, i) => (
            <div
              key={i}
              className={`absolute inset-x-0 ${band.isAlternate ? "bg-gray-50 dark:bg-gray-900/40" : "bg-white dark:bg-transparent"}`}
              style={{ top: band.topPx, height: band.heightPx }}
            >
              <span className="absolute left-0 top-1 text-[10px] text-gray-300 dark:text-gray-600 font-medium pl-1">
                {band.label}
              </span>
            </div>
          ))}

          {/* Today line — spans the full width */}
          <div
            className="absolute inset-x-0 flex items-center z-10 pointer-events-none"
            style={{ top: todayPx }}
          >
            <div className="flex-1 border-t-2 border-dashed border-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-500 px-1.5 whitespace-nowrap">
              Today
            </span>
          </div>

          {/* Cycle columns — laid out side-by-side over the shared canvas */}
          <div className="absolute inset-0 flex">
            {visibleCycles.map((cycle, colIdx) => {
              // Only show clients that are assigned and not in the warning band
              const colClients = clients.filter(
                (c) =>
                  c.reviewCycleId === cycle.id &&
                  c.currentMilestoneId &&
                  !needsAttentionIds.has(c.id)
              );

              return (
                <div
                  key={cycle.id}
                  className={`flex-1 min-w-0 relative ${
                    colIdx > 0 ? "border-l border-gray-200 dark:border-gray-700" : ""
                  }`}
                >
                  {/* Milestone blocks — left half of this column */}
                  {cycle.milestones.map((m) => {
                    const pos = getMilestonePosition(
                      m.dayOfYear,
                      m.endDayOfYear,
                      m.durationType,
                      windowStart,
                      windowEnd
                    );
                    if (!pos) return null;
                    return (
                      <div
                        key={m.id}
                        className="absolute"
                        style={{
                          top: pos.topPx,
                          left: 0,
                          width: "calc(50% - 8px)",
                          height: pos.heightPx,
                        }}
                      >
                        <MilestoneBlock milestone={m} topPx={0} heightPx={pos.heightPx} />
                      </div>
                    );
                  })}

                  {/* Client tags — right half of this column */}
                  {cycle.milestones.map((m) => {
                    const pos = getMilestonePosition(
                      m.dayOfYear,
                      m.endDayOfYear,
                      m.durationType,
                      windowStart,
                      windowEnd
                    );
                    if (!pos) return null;
                    const mClients = colClients.filter((c) => c.currentMilestoneId === m.id);
                    if (!mClients.length) return null;
                    return (
                      <div
                        key={`tags-${m.id}`}
                        className="absolute flex flex-col gap-1 pl-3 z-10"
                        style={{ top: pos.topPx + 2, left: "calc(50% + 12px)", right: 0 }}
                      >
                        {mClients.map((c) => (
                          <ClientTag
                            key={c.id}
                            client={c}
                            milestone={m}
                            stats={statsMap[c.id] ?? { total: 0, completed: 0 }}
                            onOpenDetail={() => onOpenDetail(c.id)}
                            onOpenChecklist={() => onOpenChecklist(c.id)}
                            onAdvancementNeeded={() => handleAdvancementNeeded(c.id)}
                            onYearUpdated={onRefresh}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advancement dialog */}
      <AdvancementDialog
        open={!!pendingAdvancement}
        clientName={pendingAdvancement?.clientName ?? ""}
        currentMilestoneTitle={pendingAdvancement?.currentMilestoneTitle ?? ""}
        nextMilestoneTitle={pendingAdvancement?.nextMilestoneTitle ?? ""}
        onConfirm={handleConfirmAdvancement}
        onCancel={() => setPendingAdvancement(null)}
        loading={advancingLoading}
      />

      {/* Multi-client action dialog */}
      <MultiClientActionDialog
        open={multiActionOpen}
        onClose={() => setMultiActionOpen(false)}
        reviewCycles={visibleCycles}
        clients={allVisibleClients}
        onAdvancementNeeded={(ids) => {
          const firstId = ids[0];
          if (firstId) handleAdvancementNeeded(firstId);
        }}
      />
    </div>
  );
}
