import { useEffect, useState } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-sql";
import { useDBStore } from "../store/dbStore";
import { Copy, Download, X, Code2, Loader2 } from "lucide-react";

const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SQLDrawer() {
  const tables = useDBStore((s) => s.tables);
  const relations = useDBStore((s) => s.relations);
  const drawerOpen = useDBStore((s) => s.sqlDrawerOpen);
  const setDrawerOpen = useDBStore((s) => s.setSQLDrawerOpen);

  const [sql, setSql] = useState<string>("");
  const [loading, setLoading] = useState(false);

  /* ----------------------------------
     FETCH SQL FROM BACKEND
  ----------------------------------- */
  useEffect(() => {
    if (!drawerOpen) return;

    const fetchSQL = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/sql/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tables, relations }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "SQL generation failed");
        }

        setSql(data.sql);
      } catch (e: any) {
        setSql(`-- Failed to generate SQL\n-- ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSQL();
  }, [drawerOpen, tables, relations]);

  /* ----------------------------------
     SYNTAX HIGHLIGHT
  ----------------------------------- */
  useEffect(() => {
    if (drawerOpen && sql) {
      Prism.highlightAll();
    }
  }, [sql, drawerOpen]);

  if (!drawerOpen) return null;

  const downloadSQL = () => {
    const blob = new Blob([sql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      onClick={() => setDrawerOpen(false)}
    >
      <aside
        className="absolute right-0 top-0 h-full w-[500px] bg-[#09090b] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
              <Code2 size={20} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Generated SQL
            </h2>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <button
            disabled={!sql || loading}
            onClick={() => navigator.clipboard.writeText(sql)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 transition-all text-sm font-medium disabled:opacity-50"
          >
            <Copy size={16} /> Copy to Clipboard
          </button>

          <button
            disabled={!sql || loading}
            onClick={downloadSQL}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-violet-900/20 disabled:opacity-50"
          >
            <Download size={16} /> Download .sql
          </button>
        </div>

        {/* Code Block */}
        <div className="flex-1 overflow-auto p-4 pt-0">
          <pre className="h-full rounded-xl bg-[#121212] border border-white/5 p-4 text-xs leading-relaxed overflow-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="animate-spin" size={14} />
                Generating SQL…
              </div>
            ) : (
              <code className="language-sql">{sql}</code>
            )}
          </pre>
        </div>
      </aside>
    </div>
  );
}
