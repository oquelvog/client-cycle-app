"use client";

import { useState } from "react";
import { ReviewCycle, Milestone, CheckIn, Task, DurationType } from "@/types";
import {
  createReviewCycle,
  deleteReviewCycle,
} from "@/actions/review-cycles";
import {
  createMilestone,
  deleteMilestone,
  createCheckIn,
  deleteCheckIn,
  createTask,
  deleteTask,
} from "@/actions/milestones";
import { Button } from "@/components/ui/Button";

type FullReviewCycle = ReviewCycle & {
  milestones: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] })[];
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

// ── Date conversion helpers ───────────────────────────────────────────────────

const QUARTER_RANGES: Record<string, { start: number; end: number; label: string }> = {
  Q1: { start: 1,   end: 90,  label: "Q1 — Jan–Mar" },
  Q2: { start: 91,  end: 181, label: "Q2 — Apr–Jun" },
  Q3: { start: 182, end: 273, label: "Q3 — Jul–Sep" },
  Q4: { start: 274, end: 365, label: "Q4 — Oct–Dec" },
};

const MONTH_RANGES = [
  { label: "January",   start: 1,   end: 31  },
  { label: "February",  start: 32,  end: 59  },
  { label: "March",     start: 60,  end: 90  },
  { label: "April",     start: 91,  end: 120 },
  { label: "May",       start: 121, end: 151 },
  { label: "June",      start: 152, end: 181 },
  { label: "July",      start: 182, end: 212 },
  { label: "August",    start: 213, end: 243 },
  { label: "September", start: 244, end: 273 },
  { label: "October",   start: 274, end: 304 },
  { label: "November",  start: 305, end: 334 },
  { label: "December",  start: 335, end: 365 },
];

function dateStringToDayOfYear(dateStr: string): number {
  if (!dateStr) return 1;
  // dateStr is "YYYY-MM-DD"; parse as local date to avoid UTC offset shifts
  const [, mm, dd] = dateStr.split("-").map(Number);
  // Use a non-leap reference year for consistent day numbers
  const ref = new Date(2025, mm - 1, dd);
  const start = new Date(2025, 0, 0);
  return Math.floor((ref.getTime() - start.getTime()) / 86_400_000);
}

// ── MilestoneForm sub-component ───────────────────────────────────────────────

interface MilestoneFormProps {
  cycleId: string;
  onSaved: () => void;
  onCancel: () => void;
}

function MilestoneForm({ cycleId, onSaved, onCancel }: MilestoneFormProps) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<DurationType>("month");
  const [color, setColor] = useState(COLORS[0]);

  // Quarter selection
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // index into MONTH_RANGES

  // Specific date
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);

  function getDayRange(): { dayOfYear: number; endDayOfYear: number } {
    if (duration === "quarter") {
      const q = QUARTER_RANGES[selectedQuarter];
      return { dayOfYear: q.start, endDayOfYear: q.end };
    }
    if (duration === "month") {
      const m = MONTH_RANGES[selectedMonth];
      return { dayOfYear: m.start, endDayOfYear: m.end };
    }
    // specific_date
    const start = dateStringToDayOfYear(startDate);
    const end = endDate ? dateStringToDayOfYear(endDate) : start;
    return { dayOfYear: start, endDayOfYear: end };
  }

  function isValid() {
    if (!title.trim()) return false;
    if (duration === "specific_date" && !startDate) return false;
    return true;
  }

  async function handleSave() {
    if (!isValid()) return;
    setSaving(true);
    try {
      const { dayOfYear, endDayOfYear } = getDayRange();
      await createMilestone({
        reviewCycleId: cycleId,
        title: title.trim(),
        dayOfYear,
        endDayOfYear,
        durationType: duration,
        color,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-dashed border-indigo-200 rounded-lg p-3 space-y-3 bg-indigo-50/30">
      {/* 1. Milestone name */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone name…"
        autoFocus
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
      />

      {/* 2. Interval type */}
      <div>
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Interval type</p>
        <div className="flex gap-1.5">
          {(["specific_date", "month", "quarter"] as DurationType[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                duration === d
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {DURATION_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Date inputs — conditional on type */}
      {duration === "quarter" && (
        <div>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Quarter</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(QUARTER_RANGES).map(([key, val]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedQuarter(key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                  selectedQuarter === key
                    ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {duration === "month" && (
        <div>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Month</p>
          <div className="grid grid-cols-3 gap-1">
            {MONTH_RANGES.map((m, i) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setSelectedMonth(i)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedMonth === i
                    ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {m.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {duration === "specific_date" && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              End date <span className="normal-case font-normal text-gray-400">(optional — leave blank for single day)</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
        </div>
      )}

      {/* Color picker */}
      <div>
        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={!isValid() || saving}>
          {saving ? "Adding…" : "Add milestone"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReviewCycleManager({ reviewCycles, onChanged }: Props) {
  const [newCycleName, setNewCycleName] = useState("");
  const [addingCycle, setAddingCycle] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [addingMilestone, setAddingMilestone] = useState<string | null>(null);
  const [addingCheckIn, setAddingCheckIn] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState<string | null>(null);

  const [ciTitle, setCiTitle] = useState("");
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

  async function handleAddCheckIn(milestoneId: string, dayOfYear: number) {
    await createCheckIn({ milestoneId, title: ciTitle, dayOfYear });
    setCiTitle("");
    setAddingCheckIn(null);
    onChanged();
  }

  async function handleAddTask(checkInId: string) {
    await createTask({ checkInId, title: tTitle });
    setTTitle("");
    setAddingTask(null);
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
              <span className="text-xs text-gray-400">
                {cycle.milestones.length} milestone{cycle.milestones.length !== 1 ? "s" : ""}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${expandedCycle === cycle.id ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
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
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: milestone.color }} />
                    <span className="text-sm font-medium flex-1">{milestone.title}</span>
                    <span className="text-xs text-gray-400">{DURATION_LABELS[milestone.durationType]}</span>
                    <button
                      onClick={() => deleteMilestone(milestone.id).then(onChanged)}
                      className="text-gray-300 hover:text-red-400 text-xs"
                    >✕</button>
                  </div>

                  <div className="pl-4 space-y-2">
                    {milestone.checkIns.map((ci) => (
                      <div key={ci.id} className="border-l-2 border-gray-100 pl-3">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-gray-600">{ci.title}</span>
                          <button
                            onClick={() => deleteCheckIn(ci.id).then(onChanged)}
                            className="ml-auto text-gray-300 hover:text-red-400 text-[10px]"
                          >✕</button>
                        </div>
                        <div className="space-y-0.5">
                          {ci.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-1 text-xs text-gray-500">
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span className="flex-1">{task.title}</span>
                              <button
                                onClick={() => deleteTask(task.id).then(onChanged)}
                                className="text-gray-300 hover:text-red-400"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                        {addingTask === ci.id ? (
                          <div className="flex gap-1 mt-1">
                            <input
                              value={tTitle}
                              onChange={(e) => setTTitle(e.target.value)}
                              placeholder="Task title…"
                              autoFocus
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                            />
                            <Button size="sm" onClick={() => handleAddTask(ci.id)} disabled={!tTitle.trim()}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingTask(null)}>✕</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingTask(ci.id); setTTitle(""); }}
                            className="text-[10px] text-indigo-500 hover:text-indigo-600 mt-1"
                          >+ task</button>
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
                          autoFocus
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleAddCheckIn(milestone.id, milestone.dayOfYear)}
                            disabled={!ciTitle.trim()}
                          >Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingCheckIn(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingCheckIn(milestone.id); setCiTitle(""); }}
                        className="text-xs text-indigo-500 hover:text-indigo-600 mt-1"
                      >+ add check-in</button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add milestone */}
              {addingMilestone === cycle.id ? (
                <MilestoneForm
                  cycleId={cycle.id}
                  onSaved={() => { setAddingMilestone(null); onChanged(); }}
                  onCancel={() => setAddingMilestone(null)}
                />
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setAddingMilestone(cycle.id)}>
                  + Add milestone
                </Button>
              )}

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
