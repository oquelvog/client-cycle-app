"use client";

import { Client, Milestone, ReviewCycle, Task, CheckIn } from "@/types";
import { Timeline } from "./Timeline";

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

export function MultiTimeline({
  reviewCycles,
  clients,
  selectedCycleIds,
  onOpenDetail,
  onOpenChecklist,
  onRefresh,
}: Props) {
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
    <div className="flex divide-x divide-gray-200 h-full overflow-hidden">
      {visibleCycles.map((cycle) => {
        const cycleClients = clients.filter((c) => c.reviewCycleId === cycle.id);
        return (
          <div key={cycle.id} className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-semibold text-gray-600 truncate">{cycle.name}</h3>
              <p className="text-[10px] text-gray-400">{cycleClients.length} clients</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <Timeline
                reviewCycles={[cycle]}
                clients={cycleClients}
                onOpenDetail={onOpenDetail}
                onOpenChecklist={onOpenChecklist}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
