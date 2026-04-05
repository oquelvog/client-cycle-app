"use client";

import { useEffect, useState } from "react";
import { Client, Milestone, ReviewCycle } from "@/types";
import { getLiveStats, getClientMilestoneTasks } from "@/actions/tasks";
import { updateClient, updateClientYear } from "@/actions/clients";
import { YearUpdatePrompt } from "@/components/modals/YearUpdatePrompt";
import { currentYear } from "@/lib/timeline";
import { cn } from "@/lib/utils";

interface CheckInWithTasks {
  id: string;
  title: string;
  milestoneId: string;
  tasks: {
    id: string;
    title: string;
    clientTasks: { status: string }[];
  }[];
}

interface Props {
  client: Client | null;
  reviewCycles: ReviewCycle[];
  onClose: () => void;
  onRefresh: () => void;
}

export function HouseholdDetailPanel({ client, reviewCycles, onClose, onRefresh }: Props) {
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [checkIns, setCheckIns] = useState<CheckInWithTasks[]>([]);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [lastContacted, setLastContacted] = useState("");
  const [yearDismissed, setYearDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const yr = currentYear();

  useEffect(() => {
    if (!client) return;
    setNotes(client.notes ?? "");
    setNotesDirty(false);
    setLastContacted(
      client.lastContacted
        ? new Date(client.lastContacted).toISOString().split("T")[0]
        : ""
    );
    setYearDismissed(false);
    loadData();
  }, [client?.id]);

  async function loadData() {
    if (!client) return;
    const [s, ci] = await Promise.all([
      getLiveStats(client.id, client.currentMilestoneId),
      getClientMilestoneTasks(client.id),
    ]);
    setStats(s);
    setCheckIns(ci as CheckInWithTasks[]);
  }

  async function handleSaveNotes() {
    if (!client) return;
    setSaving(true);
    try {
      await updateClient(client.id, { notes });
      setNotesDirty(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleLastContactedChange(val: string) {
    if (!client) return;
    setLastContacted(val);
    await updateClient(client.id, {
      lastContacted: val ? new Date(val) : null,
    });
    onRefresh();
  }

  async function handleYearAccept() {
    if (!client) return;
    await updateClientYear(client.id, yr);
    setYearDismissed(true);
    onRefresh();
  }

  if (!client) return null;

  const currentMilestone = client.currentMilestone as Milestone | null;
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const isYearBehind = client.cycleYear < yr;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: client.color }}
        />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex-1 truncate">{client.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Year prompt */}
        {isYearBehind && !yearDismissed && (
          <YearUpdatePrompt
            clientName={client.name}
            priorYear={client.cycleYear}
            onAccept={handleYearAccept}
            onDismiss={() => setYearDismissed(true)}
          />
        )}

        {/* Three-stat row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Status</p>
            <p className={cn("text-xs font-semibold", pct === 100 ? "text-green-600" : pct > 0 ? "text-amber-600" : "text-gray-600 dark:text-gray-300")}>
              {pct === 100 ? "Complete" : pct > 0 ? "In Progress" : "Pending"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Completion</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{pct}%</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Last Contact</p>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
              <input
                type="date"
                value={lastContacted}
                onChange={(e) => handleLastContactedChange(e.target.value)}
                className="sr-only"
              />
              <span className="hover:text-indigo-600 transition-colors">
                {lastContacted
                  ? new Date(lastContacted + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </span>
            </label>
          </div>
        </div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Current milestone progress</span>
              <span>{stats.completed}/{stats.total}</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Current milestone */}
        {currentMilestone && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Current Milestone
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: currentMilestone.color + "22",
                color: currentMilestone.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentMilestone.color }}
              />
              {currentMilestone.title}
              <span className="ml-auto text-xs opacity-70">Year {client.cycleYear}</span>
            </div>
          </div>
        )}

        {/* Task tree */}
        {checkIns.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Tasks
            </p>
            <div className="space-y-3">
              {checkIns.map((ci) => (
                <div key={ci.id}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1.5">{ci.title}</p>
                  <div className="space-y-1 pl-2">
                    {ci.tasks.map((task) => {
                      const done = task.clientTasks[0]?.status === "completed";
                      return (
                        <div key={task.id} className="flex items-center gap-2">
                          <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
                            done ? "border-green-500 bg-green-500" : "border-gray-300 dark:border-gray-600"
                          )}>
                            {done && (
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={cn("text-xs", done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300")}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
            placeholder="Add notes…"
            rows={4}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
          {notesDirty && (
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          )}
        </div>

        {/* Tags */}
        {client.tags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {client.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
