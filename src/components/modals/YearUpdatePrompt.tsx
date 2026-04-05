"use client";

import { Button } from "@/components/ui/Button";
import { currentYear } from "@/lib/timeline";

interface Props {
  clientName: string;
  priorYear: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function YearUpdatePrompt({ clientName, priorYear, onAccept, onDismiss }: Props) {
  const yr = currentYear();
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-center justify-between gap-3">
      <p className="text-amber-800">
        <span className="font-medium">{clientName}</span> is still assigned to{" "}
        {priorYear}. Update to {yr}?
      </p>
      <div className="flex gap-1.5 shrink-0">
        <Button size="sm" onClick={onAccept}>Yes</Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>No</Button>
      </div>
    </div>
  );
}
