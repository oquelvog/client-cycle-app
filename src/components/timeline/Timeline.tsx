"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getWindowBounds,
  getMonthBands,
  getMilestonePosition,
  dateToPx,
  today,
  dayOfYearToDate,
  currentYear,
} from "@/lib/timeline";
import { Client, Milestone, ReviewCycle, Task, CheckIn } from "@/types";
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

export function Timeline({
  reviewCycles,
  clients,
  onOpenDetail,
  onOpenChecklist,
  onRefresh,
}: Props) {
  const { windowStart, windowEnd, totalPx } = getWindowBounds();
  const monthBands = getMonthBands(windowStart, windowEnd);
  const todayPx = dateToPx(today(), windowStart);

  const containerRef = useRef<HTMLDivElement>(null);
  const [statsMap, setStatsMap] = useState<Record<string, { total: number; completed: number }>>({});
  const [pendingAdvancement, setPendingAdvancement] = useState<PendingAdvancement | null>(null);
  const [advancingLoading, setAdvancingLoading] = useState(false);
  const [multiActionOpen, setMultiActionOpen] = useState(false);

  // Scroll to today on mount
  useEffect(() => {
    if (containerRef.current) {
      const offset = Math.max(0, todayPx - 200);
      containerRef.current.scrollTop = offset;
    }
  }, [todayPx]);

  // Load live stats for all clients
  const loadStats = useCallback(async () => {
    const entries = await Promise.all(
      clients.map(async (c) => {
        const stats = await getLiveStats(c.id, c.currentMilestoneId);
        return [c.id, stats] as const;
      })
    );
    setStatsMap(Object.fromEntries(entries));
  }, [clients]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const allMilestones = reviewCycles.flatMap((rc) => rc.milestones);

  // Categorize clients
  const unassigned = clients.filter((c) => !c.currentMilestoneId);
  const assignedClients = clients.filter((c) => c.currentMilestoneId);

  const needsAttention = assignedClients.filter((c) => {
    if (!c.currentMilestone) return false;
    // Flag clients whose milestone date (using their actual cycle year) was
    // more than 6 months (182 days) ago. This correctly handles clients whose
    // cycleYear lags behind the current year.
    const milestoneDate = dayOfYearToDate(c.currentMilestone.dayOfYear, c.cycleYear);
    const diffDays = (today().getTime() - milestoneDate.getTime()) / 86_400_000;
    return diffDays > 182;
  });
  const needsAttentionIds = new Set(needsAttention.map((c) => c.id));

  const timelineClients = assignedClients.filter((c) => !needsAttentionIds.has(c.id));

  function getMilestonesForCycle(cycleId: string) {
    return allMilestones.filter((m) => m.reviewCycleId === cycleId);
  }

  function getClientsForMilestone(milestoneId: string) {
    return timelineClients.filter((c) => c.currentMilestoneId === milestoneId);
  }

  function handleAdvancementNeeded(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client || !client.currentMilestoneId) return;

    const cycle = reviewCycles.find((rc) => rc.id === client.reviewCycleId);
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
      {/* Warning bands */}
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

      {/* Multi-client action button */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs text-gray-400 dark:text-gray-500">Rolling 12-month timeline</span>
        <button
          onClick={() => setMultiActionOpen(true)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Multi-client action
        </button>
      </div>

      {/* Scrollable timeline */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative select-none"
        style={{ minHeight: 0 }}
      >
        <div className="relative mx-4" style={{ height: totalPx }}>
          {/* Month bands */}
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

          {/* Center line */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-gray-200 dark:bg-gray-700" />

          {/* Today line */}
          <div
            className="absolute left-1/2 right-0 flex items-center z-10"
            style={{ top: todayPx }}
          >
            <div className="flex-1 border-t-2 border-dashed border-indigo-400 ml-2" />
            <span className="text-[10px] font-semibold text-indigo-500 ml-1.5 whitespace-nowrap">
              Today
            </span>
          </div>

          {/* Milestone blocks — left side */}
          {allMilestones.map((milestone) => {
            const pos = getMilestonePosition(
              milestone.dayOfYear,
              milestone.endDayOfYear,
              milestone.durationType,
              windowStart,
              windowEnd
            );
            if (!pos) return null;
            return (
              <div
                key={milestone.id}
                className="absolute"
                style={{
                  top: pos.topPx,
                  left: 0,
                  width: "calc(50% - 8px)",
                  height: pos.heightPx,
                }}
              >
                <MilestoneBlock
                  milestone={milestone}
                  topPx={0}
                  heightPx={pos.heightPx}
                />
              </div>
            );
          })}

          {/* Client tags — right side, clustered by milestone */}
          {allMilestones.map((milestone) => {
            const pos = getMilestonePosition(
              milestone.dayOfYear,
              milestone.endDayOfYear,
              milestone.durationType,
              windowStart,
              windowEnd
            );
            if (!pos) return null;

            const mClients = getClientsForMilestone(milestone.id);
            if (mClients.length === 0) return null;

            return (
              <div
                key={`tags-${milestone.id}`}
                className="absolute flex flex-col gap-1 pl-3"
                style={{
                  top: pos.topPx + 2,
                  left: "calc(50% + 12px)",
                  right: 0,
                }}
              >
                {mClients.map((client) => (
                  <ClientTag
                    key={client.id}
                    client={client}
                    milestone={milestone}
                    stats={statsMap[client.id] ?? { total: 0, completed: 0 }}
                    onOpenDetail={() => onOpenDetail(client.id)}
                    onOpenChecklist={() => onOpenChecklist(client.id)}
                    onAdvancementNeeded={() => handleAdvancementNeeded(client.id)}
                    onYearUpdated={onRefresh}
                  />
                ))}
              </div>
            );
          })}
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
        reviewCycles={reviewCycles}
        clients={clients}
        onAdvancementNeeded={(ids) => {
          // Queue first for simplicity; a real implementation could queue all
          const firstId = ids[0];
          if (firstId) handleAdvancementNeeded(firstId);
        }}
      />
    </div>
  );
}
