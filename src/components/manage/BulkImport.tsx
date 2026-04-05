"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { importClients, ImportRow, ImportResult } from "@/actions/import";
import { Button } from "@/components/ui/Button";

interface Props {
  onImported: () => void;
}

export function BulkImport({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Client Name", "Touchpoint Cycle", "Milestone"],
      ["Johnson Family", "Annual Review", "Initial Meeting"],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Import Template");
    XLSX.writeFile(wb, "annua-import-template.xlsx");
  }

  async function processFile(file: File) {
    setLoading(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      const rows: ImportRow[] = raw.map((r) => ({
        householdName: r["Client Name"] ?? r["Household Name"] ?? r["household_name"] ?? "",
        reviewCycleName: r["Touchpoint Cycle"] ?? r["Review Cycle"] ?? r["review_cycle"] ?? "",
        milestoneName: r["Milestone"] ?? r["milestone"] ?? "",
      }));

      const res = await importClients(rows);
      setResult(res);
      if (res.created > 0) onImported();
    } catch {
      setResult({ created: 0, errors: [{ row: 0, message: "Failed to parse file. Please use the template." }] });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Upload an Excel or Google Sheets file to import clients in bulk.
        </p>
        <Button size="sm" variant="ghost" onClick={downloadTemplate}>
          Download template
        </Button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-500">
          {loading ? "Importing…" : "Drop your file here or click to browse"}
        </p>
        <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv supported</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`font-medium mb-1 ${result.errors.length > 0 ? "text-amber-800" : "text-green-800"}`}>
            {result.created} client{result.created !== 1 ? "s" : ""} imported
            {result.errors.length > 0 && `, ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`}
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700">
                  {e.row > 0 ? `Row ${e.row}: ` : ""}{e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
