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
        placeholder="Search households…"
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">
          {search ? "No households match." : "No households yet."}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: client.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {client.reviewCycle?.name ?? "—"}
                    {client.currentMilestone && ` · ${client.currentMilestone.title}`}
                  </p>
                </div>
                {client.cycleYear < yr && (
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                    {client.cycleYear}
                  </span>
                )}
                <button
                  onClick={() => setEditingId(client.id)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
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
