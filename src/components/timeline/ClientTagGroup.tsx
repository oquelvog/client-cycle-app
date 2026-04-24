"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Client, Milestone } from "@/types";
import { ClientTag } from "./ClientTag";

interface TagGroupProps {
  clients: Client[];
  milestone: Milestone;
  statsMap: Record<string, { total: number; completed: number }>;
  availableHeightPx: number;
  onOpenDetail: (clientId: string) => void;
  onOpenChecklist: (clientId: string) => void;
  onAdvancementNeeded: (clientId: string) => void;
  onYearUpdated: () => void;
}

// Measured height of one ClientTag pill: py-1 (8px) + text-xs line-height (16px) + border (2px)
const TAG_HEIGHT_PX = 26;
// gap-1 between stacked tags
const TAG_GAP_PX = 4;
const TAG_ROW_PX = TAG_HEIGHT_PX + TAG_GAP_PX;

export function ClientTagGroup({
  clients,
  milestone,
  statsMap,
  availableHeightPx,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: TagGroupProps) {
  const totalNeededPx = clients.length * TAG_ROW_PX - TAG_GAP_PX;
  const allFit = totalNeededPx <= availableHeightPx;

  if (allFit) {
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

  // How many individual tags fit while still leaving a slot for the overflow pill
  const slotsForTags = Math.max(
    0,
    Math.floor((availableHeightPx + TAG_GAP_PX) / TAG_ROW_PX) - 1
  );
  const visibleClients = clients.slice(0, slotsForTags);
  const overflowClients = clients.slice(slotsForTags);

  return (
    <>
      {visibleClients.map((c) => (
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
      <OverflowPill
        clients={overflowClients}
        milestone={milestone}
        statsMap={statsMap}
        onOpenDetail={onOpenDetail}
        onOpenChecklist={onOpenChecklist}
        onAdvancementNeeded={onAdvancementNeeded}
        onYearUpdated={onYearUpdated}
      />
    </>
  );
}

// ── Overflow pill + portal popover ────────────────────────────────────────────

interface OverflowPillProps extends Omit<TagGroupProps, "availableHeightPx"> {}

function OverflowPill({
  clients,
  milestone,
  statsMap,
  onOpenDetail,
  onOpenChecklist,
  onAdvancementNeeded,
  onYearUpdated,
}: OverflowPillProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click — check both trigger and portaled popover.
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="self-start">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-200"
      >
        <span className="flex items-center gap-0.5">
          {clients.slice(0, 3).map((c) => (
            <span
              key={c.id}
              className="w-1.5 h-1.5 rounded-full -ml-0.5 first:ml-0 ring-1 ring-white dark:ring-gray-800"
              style={{ backgroundColor: c.color }}
            />
          ))}
        </span>
        +{clients.length}
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

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[220px] max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl dark:shadow-black/50 p-2 flex flex-col gap-1"
        >
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-0.5">
            {milestone.title} · {clients.length} more
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
        </div>,
        document.body
      )}
    </div>
  );
}
