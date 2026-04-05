"use client";

import { Client } from "@/types";

interface Props {
  clients: Client[];
  onOpenDetail: (clientId: string) => void;
}

export function UnassignedBand({ clients, onOpenDetail }: Props) {
  if (clients.length === 0) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Unassigned
        </span>
        <span className="ml-auto text-xs text-gray-300 dark:text-gray-600">{clients.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpenDetail(c.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
