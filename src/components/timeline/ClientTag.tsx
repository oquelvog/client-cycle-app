"use client";

import { useState } from "react";
import { Client, Milestone } from "@/types";
import { currentYear } from "@/lib/timeline";
import { updateClientYear } from "@/actions/clients";
import { cn } from "@/lib/utils";

interface Props {
  client: Client;
  milestone: Milestone;
  stats: { total: number; completed: number };
  onOpenDetail: () => void;
  onOpenChecklist: () => void;
  onAdvancementNeeded: () => void;
  onYearUpdated: () => void;
}

export function ClientTag({
  client,
  milestone,
  stats,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: Props) {
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [updatingYear, setUpdatingYear] = useState(false);

  const yr = currentYear();
  const isYearBehind = client.cycleYear < yr;
  const allComplete = stats.total > 0 && stats.completed === stats.total;

  // Rule 3: X/Y tag at full completion should trigger advancement dialog
  // This component just signals upward — parent handles dialog
  // We show the visual but parent listens via onAdvancementNeeded when tag opens
  const tagColor = allComplete
    ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
    : stats.completed > 0
    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200";

  async function handleYearSelect(year: number) {
    setUpdatingYear(true);
    try {
      await updateClientYear(client.id, year);
      onYearUpdated();
    } finally {
      setUpdatingYear(false);
      setYearDropdownOpen(false);
    }
  }

  return (
    <div className="relative inline-flex items-stretch rounded-full shadow-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-visible text-xs font-medium">
      {/* Left segment: name + X/Y */}
      <button
        onClick={onOpenDetail}
        className={cn(
          "flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-l-full hover:opacity-80 transition-opacity",
          tagColor
        )}
        title="View client details"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: client.color }}
        />
        <span className="max-w-[100px] truncate">{client.name}</span>
        {stats.total > 0 && (
          <span className="ml-0.5 opacity-70">
            {stats.completed}/{stats.total}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px bg-gray-200 dark:bg-gray-600 self-stretch" />

      {/* Middle segment: cycleYear badge */}
      <div className="relative">
        <button
          onClick={() => setYearDropdownOpen((v) => !v)}
          className={cn(
            "flex items-center px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200",
            isYearBehind && "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
          )}
          title="Change cycle year"
        >
          {updatingYear ? "…" : client.cycleYear}
          <svg className="w-2.5 h-2.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {yearDropdownOpen && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-black/40 z-50 py-1 min-w-[80px]">
            {[yr - 1, yr, yr + 1].map((y) => (
              <button
                key={y}
                onClick={() => handleYearSelect(y)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors",
                  client.cycleYear === y && "font-semibold text-indigo-600 dark:text-indigo-400"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200 dark:bg-gray-600 self-stretch" />

      {/* Right segment: arrow → checklist */}
      <button
        onClick={() => {
          if (allComplete) {
            onAdvancementNeeded();
          } else {
            onOpenChecklist();
          }
        }}
        className="flex items-center px-2 py-1 rounded-r-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Open task checklist"
      >
        <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
