"use client";

import { useState } from "react";
import { Client, ReviewCycle, Milestone } from "@/types";
import { EditClientForm } from "./EditClientForm";
import { cn } from "@/lib/utils";
import { currentYear } from "@/lib/timeline";

interface Props {
  clients: Client[];
  reviewCycles: (ReviewCycle & { milestones: Milestone[] })[];
  onChanged: () => void;
}

export function ClientList({ clients, reviewCycles, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const yr = currentYear();

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search clients…"
        className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic py-4 text-center">
          {search ? "No clients match." : "No clients yet."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((client) =>
            editingId === client.id ? (
              <EditClientForm
                key={client.id}
                client={client}
                reviewCycles={reviewCycles}
                onSaved={() => { setEditingId(null); onChanged(); }}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <div
                key={client.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: client.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{client.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {client.reviewCycle?.name ?? "—"}
                    {client.currentMilestone && ` · ${client.currentMilestone.title}`}
                  </p>
                </div>
                {client.cycleYear < yr && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-full px-1.5 py-0.5">
                    {client.cycleYear}
                  </span>
                )}
                <button
                  onClick={() => setEditingId(client.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
