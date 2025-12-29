// src/components/DeployModal.tsx
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Terminal, Play, X, CheckCircle2 } from "lucide-react";
import { useDBStore } from "../store/dbStore";
// I assume you saved the generator here. If not, adjust path.
import { generateSQL } from "../lib/sqlGenerator"; 

// AUTOMATIC SWITCHING:
// If you run "npm run dev", it uses localhost.
// If you deploy to Render, it uses the VITE_API_URL env var.
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function DeployModal({ onClose }: { onClose: () => void }) {
  const { tables, relations } = useDBStore();
  const [targetDbUrl, setTargetDbUrl] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculatePlan = async () => {
    if (!targetDbUrl) {
      toast.error("Please enter a Connection String");
      return;
    }
    
    setLoading(true);
    try {
      // 1. Generate "Desired State" (The SQL from your canvas)
      const desiredSql = generateSQL(tables, relations);

      // 2. Call your Node.js Backend
      const response = await fetch(`${BACKEND_URL}/deploy/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desiredSql,
          targetDbUrl, 
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to calculate plan");
      }

      // 3. Show the Plan
      if (!data.plan) {
        setPlan("-- Your database is already up to date!");
        toast.success("No changes needed.");
      } else {
        setPlan(data.plan);
        toast.success("Migration Plan Calculated!");
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
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
        <div className="p-6 space-y-6">
          
          {/* Input Section */}
          <div className="space-y-3">
            <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
              Target Database (Postgres)
            </label>
            <div className="relative">
              <input
                type="text" // Hides the connection string slightly
                value={targetDbUrl}
                onChange={(e) => setTargetDbUrl(e.target.value)}
                placeholder="postgres://user:pass@host:5432/db"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-4 pr-10 py-3 text-sm text-zinc-200 font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all placeholder:text-zinc-700"
              />
            </div>
            <p className="text-[11px] text-zinc-600">
              Your connection string is sent securely to your backend solely for comparison. It is never saved.
            </p>
          </div>

          {/* Results Section */}
          {plan && (
            <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">
                  Migration Plan
                </label>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  <CheckCircle2 size={10} /> Safe Generated SQL
                </span>
              </div>
              <div className="h-64 bg-black rounded-lg p-4 overflow-auto border border-white/10 shadow-inner">
                <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                  {plan}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/50 border-t border-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
          
          <button
            onClick={handleCalculatePlan}
            disabled={loading}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            {plan ? "Recalculate" : "Calculate Diff"}
          </button>
        </div>
      </div>
    </div>
  );
}