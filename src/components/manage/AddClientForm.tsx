"use client";

import { useState } from "react";
import { ReviewCycle, Milestone } from "@/types";
import { createClient } from "@/actions/clients";
import { Button } from "@/components/ui/Button";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

interface Props {
  reviewCycles: (ReviewCycle & { milestones: Milestone[] })[];
  onCreated: () => void;
  onCancel: () => void;
}

export function AddClientForm({ reviewCycles, onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [tagsInput, setTagsInput] = useState("");
  const [reviewCycleId, setReviewCycleId] = useState(reviewCycles[0]?.id ?? "");
  const [milestoneId, setMilestoneId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCycle = reviewCycles.find((rc) => rc.id === reviewCycleId);
  const milestones = selectedCycle?.milestones ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Client name is required.");
    if (!reviewCycleId) return setError("Select a touchpoint cycle.");

    setLoading(true);
    setError("");
    try {
      await createClient({
        name: name.trim(),
        color,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        reviewCycleId,
        currentMilestoneId: milestoneId || undefined,
        cycleYear: new Date().getFullYear(),
      });
      onCreated();
    } catch {
      setError("Failed to create client. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div>
        <label className={labelCls}>
          Client Name <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Johnson Family"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>
          Tags <span className="text-gray-400 font-normal dark:text-gray-500">(comma separated)</span>
        </label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. HNW, Retiree"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Touchpoint Cycle <span className="text-red-500">*</span>
        </label>
        <select
          value={reviewCycleId}
          onChange={(e) => { setReviewCycleId(e.target.value); setMilestoneId(""); }}
          className={inputCls}
        >
          <option value="">Select…</option>
          {reviewCycles.map((rc) => (
            <option key={rc.id} value={rc.id}>{rc.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>
          Starting Milestone <span className="text-gray-400 font-normal dark:text-gray-500">(optional)</span>
        </label>
        <select
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          disabled={milestones.length === 0}
          className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">Unassigned</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Adding…" : "Add Client"}
        </Button>
      </div>
    </form>
  );
}
