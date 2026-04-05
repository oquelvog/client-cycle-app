"use client";

import { useState } from "react";
import { ReviewCycle, Milestone, CheckIn, Task, DurationType } from "@/types";
import {
  createReviewCycle,
  updateReviewCycle,
  deleteReviewCycle,
} from "@/actions/review-cycles";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createCheckIn,
  deleteCheckIn,
  createTask,
  deleteTask,
} from "@/actions/milestones";
import { Button } from "@/components/ui/Button";

type FullReviewCycle = ReviewCycle & {
  milestones: (Milestone & {
    checkIns: (CheckIn & { tasks: Task[] })[];
  })[];
};

interface Props {
  reviewCycles: FullReviewCycle[];
  onChanged: () => void;
}

const DURATION_LABELS: Record<DurationType, string> = {
  specific_date: "Specific Date",
  month: "Month",
  quarter: "Quarter",
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

export function ReviewCycleManager({ reviewCycles, onChanged }: Props) {
  const [newCycleName, setNewCycleName] = useState("");
  const [addingCycle, setAddingCycle] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState<string | null>(null);
  const [addingCheckIn, setAddingCheckIn] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState<string | null>(null);

  // Milestone form state
  const [mTitle, setMTitle] = useState("");
  const [mDuration, setMDuration] = useState<DurationType>("month");
  const [mDay, setMDay] = useState("1");
  const [mEndDay, setMEndDay] = useState("30");
  const [mColor, setMColor] = useState(COLORS[0]);

  // CheckIn form state
  const [ciTitle, setCiTitle] = useState("");
  const [ciDay, setCiDay] = useState("1");

  // Task form state
  const [tTitle, setTTitle] = useState("");

  async function handleAddCycle() {
    if (!newCycleName.trim()) return;
    setAddingCycle(true);
    try {
      await createReviewCycle({ name: newCycleName.trim() });
      setNewCycleName("");
      onChanged();
    } finally {
      setAddingCycle(false);
    }
  }

  async function handleAddMilestone(cycleId: string) {
    await createMilestone({
      reviewCycleId: cycleId,
      title: mTitle,
      dayOfYear: parseInt(mDay),
      endDayOfYear: parseInt(mEndDay),
      durationType: mDuration,
      color: mColor,
    });
    setMTitle(""); setAddingMilestone(null);
    onChanged();
  }

  async function handleAddCheckIn(milestoneId: string) {
    await createCheckIn({ milestoneId, title: ciTitle, dayOfYear: parseInt(ciDay) });
    setCiTitle(""); setAddingCheckIn(null);
    onChanged();
  }

  async function handleAddTask(checkInId: string) {
    await createTask({ checkInId, title: tTitle });
    setTTitle(""); setAddingTask(null);
    onChanged();
  }

  return (
    <div className="space-y-3">
      {/* Add cycle */}
      <div className="flex gap-2">
        <input
          value={newCycleName}
          onChange={(e) => setNewCycleName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCycle()}
          placeholder="New review cycle name…"
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
        <Button onClick={handleAddCycle} disabled={addingCycle || !newCycleName.trim()}>
          Add cycle
        </Button>
      </div>

      {/* Cycle list */}
      {reviewCycles.map((cycle) => (
        <div key={cycle.id} className="border border-gray-200 rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
            onClick={() => setExpandedCycle(expandedCycle === cycle.id ? null : cycle.id)}
          >
            <span className="font-medium text-sm text-gray-800">{cycle.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{cycle.milestones.length} milestone{cycle.milestones.length !== 1 ? "s" : ""}</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedCycle === cycle.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {expandedCycle === cycle.id && (
            <div className="p-4 space-y-3">
              {/* Milestones */}
              {cycle.milestones.map((milestone) => (
                <div key={milestone.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: milestone.color }} />
                    <span className="text-sm font-medium flex-1">{milestone.title}</span>
                    <span className="text-xs text-gray-400">{DURATION_LABELS[milestone.durationType]}</span>
                    <button onClick={() => deleteMilestone(milestone.id).then(onChanged)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </div>

                  {/* Check-ins */}
                  <div className="pl-4 space-y-2">
                    {milestone.checkIns.map((ci) => (
                      <div key={ci.id} className="border-l-2 border-gray-100 pl-3">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-gray-600">{ci.title}</span>
                          <button onClick={() => deleteCheckIn(ci.id).then(onChanged)} className="ml-auto text-gray-300 hover:text-red-400 text-[10px]">✕</button>
                        </div>
                        {/* Tasks */}
                        <div className="space-y-0.5">
                          {ci.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-1 text-xs text-gray-500">
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span className="flex-1">{task.title}</span>
                              <button onClick={() => deleteTask(task.id).then(onChanged)} className="text-gray-300 hover:text-red-400">✕</button>
                            </div>
                          ))}
                        </div>
                        {/* Add task */}
                        {addingTask === ci.id ? (
                          <div className="flex gap-1 mt-1">
                            <input
                              value={tTitle}
                              onChange={(e) => setTTitle(e.target.value)}
                              placeholder="Task title…"
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                              autoFocus
                            />
                            <Button size="sm" onClick={() => handleAddTask(ci.id)} disabled={!tTitle.trim()}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingTask(null)}>✕</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingTask(ci.id); setTTitle(""); }} className="text-[10px] text-indigo-500 hover:text-indigo-600 mt-1">
                            + task
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Add check-in */}
                    {addingCheckIn === milestone.id ? (
                      <div className="space-y-1 mt-2">
                        <input
                          value={ciTitle}
                          onChange={(e) => setCiTitle(e.target.value)}
                          placeholder="Check-in title…"
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={ciDay}
                          onChange={(e) => setCiDay(e.target.value)}
                          placeholder="Day of year"
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleAddCheckIn(milestone.id)} disabled={!ciTitle.trim()}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingCheckIn(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingCheckIn(milestone.id); setCiTitle(""); }} className="text-xs text-indigo-500 hover:text-indigo-600 mt-1">
                        + add check-in
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add milestone */}
              {addingMilestone === cycle.id ? (
                <div className="border border-dashed border-indigo-200 rounded-lg p-3 space-y-2 bg-indigo-50/30">
                  <input
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    placeholder="Milestone title…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Start day of year</label>
                      <input type="number" min="1" max="365" value={mDay} onChange={(e) => setMDay(e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">End day of year</label>
                      <input type="number" min="1" max="365" value={mEndDay} onChange={(e) => setMEndDay(e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none" />
                    </div>
                  </div>
                  <select value={mDuration} onChange={(e) => setMDuration(e.target.value as DurationType)} className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none">
                    <option value="specific_date">Specific Date</option>
                    <option value="month">Month</option>
                    <option value="quarter">Quarter</option>
                  </select>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setMColor(c)} className={`w-5 h-5 rounded-full ${mColor === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddMilestone(cycle.id)} disabled={!mTitle.trim()}>Add milestone</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingMilestone(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => { setAddingMilestone(cycle.id); setMTitle(""); }}>
                  + Add milestone
                </Button>
              )}

              {/* Delete cycle */}
              <button
                onClick={() => deleteReviewCycle(cycle.id).then(onChanged)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete this review cycle
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
