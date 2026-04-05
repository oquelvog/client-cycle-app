"use client";

import { useState } from "react";
import { Client, ReviewCycle, Milestone } from "@/types";
import { updateClient, deleteClient } from "@/actions/clients";
import { Button } from "@/components/ui/Button";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];

interface Props {
  client: Client;
  reviewCycles: (ReviewCycle & { milestones: Milestone[] })[];
  onSaved: () => void;
  onClose: () => void;
}

export function EditClientForm({ client, reviewCycles, onSaved, onClose }: Props) {
  const [name, setName] = useState(client.name);
  const [color, setColor] = useState(client.color);
  const [tagsInput, setTagsInput] = useState(client.tags.join(", "));
  const [reviewCycleId, setReviewCycleId] = useState(client.reviewCycleId);
  const [milestoneId, setMilestoneId] = useState(client.currentMilestoneId ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedCycle = reviewCycles.find((rc) => rc.id === reviewCycleId);
  const milestones = selectedCycle?.milestones ?? [];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateClient(client.id, {
        name,
        color,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        reviewCycleId,
        currentMilestoneId: milestoneId || null,
      });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      onSaved();
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "w-full mt-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";
  const labelCls = "text-xs font-medium text-gray-700 dark:text-gray-300";

  return (
    <form onSubmit={handleSave} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Editing {client.name}</span>
        <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <label className={labelCls}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Color</label>
        <div className="flex gap-1.5 flex-wrap mt-1">
          {COLORS.map((c) => (
            <button
              key={c} type="button" onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Tags</label>
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Touchpoint Cycle</label>
        <select
          value={reviewCycleId}
          onChange={(e) => { setReviewCycleId(e.target.value); setMilestoneId(""); }}
          className={inputCls}
        >
          {reviewCycles.map((rc) => (
            <option key={rc.id} value={rc.id}>{rc.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Milestone</label>
        <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className={inputCls}>
          <option value="">Unassigned</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between pt-1">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">Are you sure?</span>
            <Button type="button" size="sm" variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>No</Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
