"use client";

import { useEffect, useRef, useState } from "react";
import { Client, Milestone } from "@/types";
import { ClientTag } from "./ClientTag";

interface TagGroupProps {
  clients: Client[];
  milestone: Milestone;
  statsMap: Record<string, { total: number; completed: number }>;
  onOpenDetail: (clientId: string) => void;
  onOpenChecklist: (clientId: string) => void;
  onAdvancementNeeded: (clientId: string) => void;
  onYearUpdated: () => void;
}

const COLLAPSE_THRESHOLD = 3;

export function ClientTagGroup({
  clients,
  milestone,
  statsMap,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: TagGroupProps) {
  // Fewer than threshold: render tags individually
  if (clients.length < COLLAPSE_THRESHOLD) {
    return (
      <>
        {clients.map((c) => (
          <ClientTag
            key={c.id}
            client={c}
            milestone={milestone}
            stats={statsMap[c.id] ?? { total: 0, completed: 0 }}
            onOpenDetail={() => onOpenDetail(c.id)}
            onOpenChecklist={() => onOpenChecklist(c.id)}
            onAdvancementNeeded={() => onAdvancementNeeded(c.id)}
            onYearUpdated={onYearUpdated}
          />
        ))}
      </>
    );
  }

  return (
    <CollapsedGroup
      clients={clients}
      milestone={milestone}
      statsMap={statsMap}
      onOpenDetail={onOpenDetail}
      onOpenChecklist={onOpenChecklist}
      onAdvancementNeeded={onAdvancementNeeded}
      onYearUpdated={onYearUpdated}
    />
  );
}

// ── Collapsed pill + popover ──────────────────────────────────────────────────

function CollapsedGroup({
  clients,
  milestone,
  statsMap,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: TagGroupProps) {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={groupRef} className="relative self-start">
      {/* Count pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
      >
        <span className="flex items-center gap-0.5">
          {/* Three stacked dots indicating multiple clients */}
          {clients.slice(0, 3).map((c) => (
            <span
              key={c.id}
              className="w-1.5 h-1.5 rounded-full -ml-0.5 first:ml-0 ring-1 ring-white dark:ring-gray-800"
              style={{ backgroundColor: c.color }}
            />
          ))}
        </span>
        {clients.length} clients
        <svg
          className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[220px] max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl dark:shadow-black/50 p-2 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-0.5">
            {milestone.title} · {clients.length} clients
          </p>
          {clients.map((c) => (
            <ClientTag
              key={c.id}
              client={c}
              milestone={milestone}
              stats={statsMap[c.id] ?? { total: 0, completed: 0 }}
              onOpenDetail={() => { onOpenDetail(c.id); setOpen(false); }}
              onOpenChecklist={() => { onOpenChecklist(c.id); setOpen(false); }}
              onAdvancementNeeded={() => { onAdvancementNeeded(c.id); setOpen(false); }}
              onYearUpdated={onYearUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
