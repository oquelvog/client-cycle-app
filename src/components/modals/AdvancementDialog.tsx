"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  clientName: string;
  currentMilestoneTitle: string;
  nextMilestoneTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function AdvancementDialog({
  open,
  clientName,
  currentMilestoneTitle,
  nextMilestoneTitle,
  onConfirm,
  onCancel,
  loading,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <div className="p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Advance client?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <span className="font-medium">{clientName}</span> has completed all
          tasks in <span className="font-medium">{currentMilestoneTitle}</span>.
          Advance to{" "}
          <span className="font-medium">{nextMilestoneTitle}</span>?
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
          Tasks for the new milestone will be reset to pending.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Advancing…" : "Confirm & Advance"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
