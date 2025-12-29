import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Terminal,
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  Rocket,
} from "lucide-react";
import { useDBStore } from "../store/dbStore";
import { parseAtlasJson } from "../lib/schemaImporter";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export function DeployModal({ onClose }: { onClose: () => void }) {
  const { tables, relations } = useDBStore();

  // --- STATE ---
  const [targetDbUrl, setTargetDbUrl] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  /* ----------------------------------
     WARNINGS (Destructive Detection)
  ----------------------------------- */
  const warnings = useMemo(() => {
    if (!plan) return [];
    const w: string[] = [];
    if (plan.includes("DROP TABLE")) w.push("This plan will DELETE tables.");
    if (plan.includes("DROP COLUMN")) w.push("This plan will DELETE columns.");
    if (plan.includes("TRUNCATE")) w.push("This plan will WIPE data.");
    return w;
  }, [plan]);

  /* ----------------------------------
     BACKEND: GENERATE SQL
  ----------------------------------- */
  const fetchGeneratedSQL = async (): Promise<string> => {
    const res = await fetch(`${BACKEND_URL}/sql/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tables, relations }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "SQL generation failed");
    }
    return data.sql;
  };

  /* ----------------------------------
     ACTION 1: PLAN
  ----------------------------------- */
  const handleCalculatePlan = async () => {
    if (!targetDbUrl) {
      return toast.error("Please enter a Connection String");
    }

    setLoading(true);
    setPlan(null);

    try {
      const desiredSql = await fetchGeneratedSQL();

      const res = await fetch(`${BACKEND_URL}/deploy/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredSql, targetDbUrl }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to calculate plan");
      }

      setPlan(data.plan);

      if (data.plan.includes("-- Database is up to date")) {
        toast.success("Database is already up to date!");
      } else {
        toast.info("Migration plan calculated");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------
     ACTION 2: APPLY
  ----------------------------------- */
  const handleApply = async () => {
    if (!targetDbUrl || !plan) return;

    if (warnings.length > 0) {
      const confirmed = confirm(
        "⚠️ DESTRUCTIVE CHANGES DETECTED ⚠️\n\nThis will DELETE data.\nAre you sure?"
      );
      if (!confirmed) return;
    }

    setApplying(true);
    try {
      const desiredSql = await fetchGeneratedSQL();

      const res = await fetch(`${BACKEND_URL}/deploy/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredSql, targetDbUrl }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || "Apply failed");
      }

      toast.success("🚀 Database updated successfully!");
      onClose();
    } catch (e: any) {
      toast.error("Deployment Failed: " + e.message);
    } finally {
      setApplying(false);
    }
  };

  /* ----------------------------------
     ACTION 3: IMPORT / INSPECT
  ----------------------------------- */
  const handleImport = async () => {
    if (!targetDbUrl) {
      return toast.error("Please enter a Connection String");
    }

    if (
      !confirm(
        "This will OVERWRITE your current canvas with the database schema.\n\nContinue?"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/deploy/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDbUrl }),
      });

      const json = await res.json();
      if (!json.schemas) {
        throw new Error("Invalid response from database");
      }

      const { tables: newTables, relations: newRelations } =
        parseAtlasJson(json);

      useDBStore.setState({
        tables: newTables,
        relations: newRelations,
      });

      toast.success(`Imported ${newTables.length} tables from database!`);
      onClose();
    } catch (e: any) {
      toast.error("Import Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------------
     RENDER
  ----------------------------------- */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
          <h2 className="text-zinc-100 font-medium flex items-center gap-2">
            <Terminal className="text-violet-500" size={18} />
            Schema Deployment
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <label className="text-xs uppercase text-zinc-500 font-bold">
              Target Database
            </label>
            <input
              value={targetDbUrl}
              onChange={(e) => setTargetDbUrl(e.target.value)}
              placeholder="postgres://user:pass@host:5432/db"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 font-mono"
            />
          </div>

          {plan && (
            <div className="space-y-4">
              {warnings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="text-red-500" size={16} />
                  <ul className="text-xs text-red-400 list-disc list-inside">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center">
                <label className="text-xs uppercase text-zinc-500 font-bold">
                  Migration Plan
                </label>
                {!warnings.length && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Safe to Apply
                  </span>
                )}
              </div>

              <pre className="h-64 bg-black rounded-lg p-4 text-xs text-zinc-300 overflow-auto">
                {plan}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex gap-3 justify-end">
          <button
            onClick={handleImport}
            disabled={loading || applying}
            className="mr-auto px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg flex gap-2"
          >
            <Download size={16} /> Import
          </button>

          <button onClick={onClose} className="text-zinc-400 px-4">
            Cancel
          </button>

          {!plan ? (
            <button
              onClick={handleCalculatePlan}
              disabled={loading}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg flex gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Play size={16} />
              )}
              Calculate Diff
            </button>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className={`px-6 py-2 text-white rounded-lg flex gap-2 ${
                warnings.length
                  ? "bg-red-600"
                  : "bg-emerald-600"
              }`}
            >
              {applying ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Rocket size={16} />
              )}
              Push to DB
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
