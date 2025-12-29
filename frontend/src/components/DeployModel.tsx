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
  Rocket 
} from "lucide-react";
import { useDBStore } from "../store/dbStore";
import { generateSQL } from "../lib/sqlGenerator"; 
import { parseAtlasJson } from "../lib/schemaImporter";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function DeployModal({ onClose }: { onClose: () => void }) {
  const { tables, relations } = useDBStore();
  
  // --- STATE ---
  const [targetDbUrl, setTargetDbUrl] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  // --- ANALYSIS: Detect Destructive Changes ---
  const warnings = useMemo(() => {
    if (!plan) return [];
    const warns: string[] = [];
    if (plan.includes("DROP TABLE")) warns.push("This plan will DELETE tables.");
    if (plan.includes("DROP COLUMN")) warns.push("This plan will DELETE columns.");
    if (plan.includes("TRUNCATE")) warns.push("This plan will WIPE data.");
    return warns;
  }, [plan]);

  // --- ACTION 1: CALCULATE PLAN (Preview) ---
  const handleCalculatePlan = async () => {
    if (!targetDbUrl) return toast.error("Please enter a Connection String");
    
    setLoading(true);
    setPlan(null); // Reset previous view

    try {
      const desiredSql = generateSQL(tables, relations);
      
      const res = await fetch(`${BACKEND_URL}/deploy/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredSql, targetDbUrl }),
      });

      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || "Failed to calculate plan");

      // Success
      setPlan(data.plan);
      if (data.plan.includes("-- Database is up to date")) {
        toast.success("Database is already up to date!");
      } else {
        toast.info("Migration plan calculated");
      }

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTION 2: APPLY CHANGES (Execute) ---
  const handleApply = async () => {
    if (!targetDbUrl || !plan) return;

    // Safety Gate
    if (warnings.length > 0) {
      const confirmed = confirm(
        "⚠️ DESTRUCTIVE CHANGES DETECTED ⚠️\n\nThis will DELETE data in your database.\nAre you sure you want to continue?"
      );
      if (!confirmed) return;
    }

    setApplying(true);
    try {
      const desiredSql = generateSQL(tables, relations);
      
      const res = await fetch(`${BACKEND_URL}/deploy/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desiredSql, targetDbUrl }),
      });

      const data = await res.json();
      
      if (!data.success) throw new Error(data.message || data.error || "Apply failed");

      toast.success("🚀 Database updated successfully!");
      onClose(); // Close modal on success

    } catch (err: any) {
      toast.error("Deployment Failed: " + err.message);
    } finally {
      setApplying(false);
    }
  };

  // --- ACTION 3: IMPORT FROM DB (Reverse Engineer) ---
  const handleImport = async () => {
    if (!targetDbUrl) return toast.error("Please enter a Connection String");
    
    if (!confirm("This will OVERWRITE your current canvas with the database schema.\n\nContinue?")) {
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
      
      // Basic validation that we got a real Atlas schema
      if (!json.schemas) {
         console.error("Invalid Response:", json);
         throw new Error("Invalid response from database. Check console.");
      }

      // Parse & Update Store
      const { tables: newTables, relations: newRelations } = parseAtlasJson(json);
      useDBStore.setState({ tables: newTables, relations: newRelations });
      
      toast.success(`Imported ${newTables.length} tables from database!`);
      onClose();

    } catch (e: any) {
      toast.error("Import Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
          <h2 className="text-zinc-100 font-medium flex items-center gap-2">
            <Terminal className="text-violet-500" size={18} />
            Schema Deployment
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Input */}
          <div className="space-y-3">
            <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
              Target Database
            </label>
            <input
              type="text"
              value={targetDbUrl}
              onChange={(e) => setTargetDbUrl(e.target.value)}
              placeholder="postgres://user:pass@host:6543/db"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all"
            />
          </div>

          {/* Results Area */}
          {plan && (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
              
              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-400">Destructive Changes Detected</p>
                    <ul className="text-xs text-red-400/80 list-disc list-inside">
                      {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* Plan Label */}
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
                  Migration Plan
                </label>
                {!warnings.length && (
                   <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                     <CheckCircle2 size={10} /> Safe to Apply
                   </span>
                )}
              </div>
              
              {/* Code Box */}
              <div className="h-64 bg-black rounded-lg p-4 overflow-auto border border-white/10 shadow-inner group relative">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {plan}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex justify-end gap-3">
          
          {/* Left: Import Button */}
          <button 
            onClick={handleImport} 
            disabled={loading || applying} 
            className="mr-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-lg flex items-center gap-2 transition-all"
            title="Import schema from database to canvas"
          >
            <Download size={16} /> 
            Import
          </button>

          {/* Right: Actions */}
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          
          {!plan ? (
            // State: Initial
            <button
              onClick={handleCalculatePlan}
              disabled={loading}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
              Calculate Diff
            </button>
          ) : (
            // State: Reviewing Plan
            <div className="flex gap-2">
               <button 
                 onClick={handleCalculatePlan} 
                 disabled={loading || applying} 
                 className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
               >
                  Recalculate
               </button>
               
               <button 
                 onClick={handleApply} 
                 disabled={applying}
                 className={`px-6 py-2 text-white text-sm font-medium rounded-lg flex gap-2 items-center transition-all shadow-lg ${
                    warnings.length > 0 
                      ? "bg-red-600 hover:bg-red-500 shadow-red-900/20" 
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                 }`}
               >
                 {applying ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={16} />}
                 {applying ? "Applying..." : "Push to DB"}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}