"use client";

import { useCallback, useEffect, useState } from "react";
import { ReviewCycle, Client, Milestone, CheckIn, Task } from "@/types";
import { ReviewCycleManager } from "@/components/manage/ReviewCycleManager";
import { ClientList } from "@/components/manage/ClientList";
import { AddClientForm } from "@/components/manage/AddClientForm";
import { BulkImport } from "@/components/manage/BulkImport";

type FullReviewCycle = ReviewCycle & {
  milestones: (Milestone & { checkIns: (CheckIn & { tasks: Task[] })[] })[];
};

type FullClient = Client & {
  reviewCycle: ReviewCycle;
  currentMilestone: Milestone | null;
};

type Tab = "households" | "cycles" | "import";

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>("households");
  const [reviewCycles, setReviewCycles] = useState<FullReviewCycle[]>([]);
  const [clients, setClients] = useState<FullClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingClient, setAddingClient] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/data");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { reviewCycles: cycles, clients: cls } = await res.json();
      setReviewCycles(cycles);
      setClients(cls);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-red-600">Failed to load data</p>
        <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-w-lg whitespace-pre-wrap break-all">{error}</pre>
        <button onClick={load} className="text-xs text-indigo-600 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Manage</h1>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {(["households", "cycles", "import"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t === "cycles" ? "Review Cycles" : t === "import" ? "Bulk Import" : "Households"}
            </button>
          ))}
        </div>

        {tab === "households" && (
          <div className="space-y-4">
            {addingClient ? (
              <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50/20 dark:bg-indigo-950/20">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Household</h2>
                <AddClientForm
                  reviewCycles={reviewCycles}
                  onCreated={() => { setAddingClient(false); load(); }}
                  onCancel={() => setAddingClient(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingClient(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add household
              </button>
            )}
            <ClientList clients={clients} reviewCycles={reviewCycles} onChanged={load} />
          </div>
        )}

        {tab === "cycles" && <ReviewCycleManager reviewCycles={reviewCycles} onChanged={load} />}
        {tab === "import" && <BulkImport onImported={load} />}
      </div>
    </div>
  );
}
