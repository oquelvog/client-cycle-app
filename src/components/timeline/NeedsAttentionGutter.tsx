"use client";

import { Client, Milestone } from "@/types";
import { ClientTag } from "./ClientTag";

interface Props {
  clients: Client[];
  statsMap: Record<string, { total: number; completed: number }>;
  onOpenDetail: (clientId: string) => void;
  onOpenChecklist: (clientId: string) => void;
  onAdvancementNeeded: (clientId: string) => void;
  onYearUpdated: () => void;
}

export function NeedsAttentionGutter({
  clients,
  statsMap,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: Props) {
  if (clients.length === 0) return null;

  return (
    <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
          Needs Attention
        </span>
        <span className="ml-auto text-xs text-red-400 dark:text-red-500">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {clients.map((client) => (
          <ClientTag
            key={client.id}
            client={client}
            milestone={client.currentMilestone as Milestone}
            stats={statsMap[client.id] ?? { total: 0, completed: 0 }}
            onOpenDetail={() => onOpenDetail(client.id)}
            onOpenChecklist={() => onOpenChecklist(client.id)}
            onAdvancementNeeded={() => onAdvancementNeeded(client.id)}
            onYearUpdated={onYearUpdated}
          />
        ))}
      </div>
    </div>
  );
}
