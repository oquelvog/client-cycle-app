"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Client, Milestone, Task, CheckIn } from "@/types";
import { bulkCompleteTask } from "@/actions/tasks";

interface Props {
  open: boolean;
  onClose: () => void;
  reviewCycles: {
    id: string;
    name: string;
    milestones: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] })[];
  }[];
  clients: Client[];
  onAdvancementNeeded: (clientIds: string[]) => void;
}

type Step = 1 | 2 | 3;

export function MultiClientActionDialog({
  open,
  onClose,
  reviewCycles,
  clients,
  onAdvancementNeeded,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const allMilestones = reviewCycles.flatMap((rc) => rc.milestones);
  const selectedMilestone = allMilestones.find((m) => m.id === selectedMilestoneId);
  const allTasks = selectedMilestone?.checkIns.flatMap((ci) => ci.tasks) ?? [];
  const clientsInMilestone = clients.filter((c) => c.currentMilestoneId === selectedMilestoneId);

  function reset() {
    setStep(1);
    setSelectedMilestoneId("");
    setSelectedTaskId("");
    setSelectedClientIds(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleMilestoneSelect(id: string) {
    setSelectedMilestoneId(id);
    setSelectedTaskId("");
    setSelectedClientIds(new Set(clients.filter((c) => c.currentMilestoneId === id).map((c) => c.id)));
  }

  function toggleClient(id: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (!selectedTaskId || selectedClientIds.size === 0) return;
    setLoading(true);
    try {
      const ids = Array.from(selectedClientIds);
      const advanceable = await bulkCompleteTask(selectedTaskId, ids);
      if (advanceable.length > 0) onAdvancementNeeded(advanceable);
      handleClose();
    } finally {
      setLoading(false);
    }
  }

  const itemBase = "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors border";
  const itemActive = "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300";
  const itemIdle = "hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300";

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Multi-Client Action</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">Step {step} of 3</span>
        </div>

        {/* Step 1: Select milestone */}
        {step === 1 && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Select a milestone:</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allMilestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMilestoneSelect(m.id)}
                  className={`${itemBase} ${selectedMilestoneId === m.id ? itemActive : itemIdle}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: m.color }} />
                  {m.title}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button disabled={!selectedMilestoneId} onClick={() => setStep(2)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 2: Select task */}
        {step === 2 && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Select a task in{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">{selectedMilestone?.title}</span>:
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allTasks.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No tasks in this milestone.</p>
              ) : (
                allTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`${itemBase} ${selectedTaskId === t.id ? itemActive : itemIdle}`}
                  >
                    {t.title}
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!selectedTaskId} onClick={() => setStep(3)}>Next</Button>
            </div>
          </div>
        )}

        {/* Step 3: Select clients */}
        {step === 3 && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Apply to which clients?{" "}
              <button
                className="text-indigo-600 hover:underline text-xs"
                onClick={() => setSelectedClientIds(new Set(clientsInMilestone.map((c) => c.id)))}
              >
                Select all
              </button>
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {clientsInMilestone.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedClientIds.has(c.id)}
                    onChange={() => toggleClient(c.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c.name}</span>
                </label>
              ))}
              {clientsInMilestone.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No clients in this milestone.</p>
              )}
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={selectedClientIds.size === 0 || loading} onClick={handleConfirm}>
                {loading ? "Applying…" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
