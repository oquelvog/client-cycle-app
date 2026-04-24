"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Client, Milestone } from "@/types";
import { getClientMilestoneTasks, toggleClientTask } from "@/actions/tasks";
import { advanceClient } from "@/actions/clients";
import { AdvancementDialog } from "@/components/modals/AdvancementDialog";
import { YearUpdatePrompt } from "@/components/modals/YearUpdatePrompt";
import { updateClientYear } from "@/actions/clients";
import { currentYear } from "@/lib/timeline";

interface CheckInWithTasks {
  id: string;
  title: string;
  dayOfYear: number;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    clientTasks: { status: string; completedAt: Date | null }[];
  }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  client: Client;
  milestone: Milestone | null;
  allMilestones: Milestone[];
  onRefresh: () => void;
}

export function TaskChecklistPanel({ open, onClose, client, milestone, allMilestones, onRefresh }: Props) {
  const [checkIns, setCheckIns] = useState<CheckInWithTasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showAdvancement, setShowAdvancement] = useState(false);
  const [yearDismissed, setYearDismissed] = useState(false);

  const yr = currentYear();
  const isYearBehind = client.cycleYear < yr;

  const milestones = [...allMilestones].sort((a, b) => a.dayOfYear - b.dayOfYear);
  const currentIdx = milestone ? milestones.findIndex((m) => m.id === milestone.id) : -1;
  const nextMilestone =
    currentIdx >= 0
      ? milestones[currentIdx === milestones.length - 1 ? 0 : currentIdx + 1]
      : null;

  async function load() {
    setLoading(true);
    try {
      const data = await getClientMilestoneTasks(client.id);
      setCheckIns(data as CheckInWithTasks[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open, client.id]);

  function isTaskComplete(task: CheckInWithTasks["tasks"][0]) {
    return task.clientTasks[0]?.status === "completed";
  }

  function getTotalStats() {
    const allTasks = checkIns.flatMap((ci) => ci.tasks);
    const completed = allTasks.filter((t) => isTaskComplete(t)).length;
    return { total: allTasks.length, completed };
  }

  async function handleToggle(taskId: string, completed: boolean) {
    const stats = await toggleClientTask(client.id, taskId, completed);
    await load();
    if (stats.total > 0 && stats.completed === stats.total) {
      setShowAdvancement(true);
    }
  }

  async function handleFinishAll() {
    setShowAdvancement(true);
  }

  async function handleConfirmAdvancement() {
    setAdvancing(true);
    try {
      await advanceClient(client.id);
      onRefresh();
      onClose();
    } finally {
      setAdvancing(false);
      setShowAdvancement(false);
    }
  }

  async function handleYearAccept() {
    await updateClientYear(client.id, yr);
    setYearDismissed(true);
    onRefresh();
  }

  const { total, completed } = getTotalStats();
  const allComplete = total > 0 && completed === total;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <Modal open={open} onClose={onClose} size="md">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{client.name}</h3>
              {milestone && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{milestone.title}</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Year prompt */}
          {isYearBehind && !yearDismissed && (
            <div className="mb-3">
              <YearUpdatePrompt
                clientName={client.name}
                priorYear={client.cycleYear}
                onAccept={handleYearAccept}
                onDismiss={() => setYearDismissed(true)}
              />
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{completed}/{total} tasks</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${allComplete ? "bg-green-500" : "bg-indigo-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Tasks */}
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Loading…</div>
          ) : checkIns.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No tasks for this milestone.
            </div>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto">
              {checkIns.map((ci) => (
                <div key={ci.id}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {ci.title}
                  </p>
                  <div className="space-y-1.5">
                    {ci.tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-start gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={isTaskComplete(task)}
                          onChange={(e) => handleToggle(task.id, e.target.checked)}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className={`text-sm ${isTaskComplete(task) ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={handleFinishAll} disabled={allComplete}>
              Finish All &amp; Advance
            </Button>
          </div>
        </div>
      </Modal>

      <AdvancementDialog
        open={showAdvancement}
        clientName={client.name}
        currentMilestoneTitle={milestone?.title ?? "Current milestone"}
        nextMilestoneTitle={nextMilestone?.title ?? "Next milestone"}
        onConfirm={handleConfirmAdvancement}
        onCancel={() => setShowAdvancement(false)}
        loading={advancing}
      />
    </>
  );
}
