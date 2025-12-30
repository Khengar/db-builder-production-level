import { useState, useRef } from "react";
import { X, UploadCloud, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiService } from "../lib/api"; 

interface GenerateModalProps {
  onClose: () => void;
  onSuccess: (jsonData: any) => void;
}

export default function GenerateModal({ onClose, onSuccess }: GenerateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG)");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  // --- ADAPTER: AI Backend -> React Flow UI ---
  const adaptSchema = (data: any) => {
    if (!data || !data.tables) return data;

    const tableIdMap = new Map<string, string>();
    const colIdMap = new Map<string, string>();

    // 1. Tables: Generate IDs, Layout, and Map Types
    const newTables = data.tables.map((table: any, index: number) => {
      const tableId = crypto.randomUUID();
      tableIdMap.set(table.name, tableId);

      // Grid Layout (3 per row)
      const x = (index % 3) * 350;
      const y = Math.floor(index / 3) * 350;

      return {
        ...table,
        id: tableId,
        x: x,
        y: y,
        columns: table.columns.map((col: any) => {
          const colId = crypto.randomUUID();
          colIdMap.set(`${table.name}.${col.name}`, colId);
          
          // Map Backend Types (UPPERCASE) -> Frontend UI Options (lowercase)
          // Matches your TableNode.tsx options: "int", "text", "date", "bool", "uuid", "json"
          let type = col.type.toLowerCase();
          
          if (type === "integer") type = "int";
          if (type === "timestamp" || type === "datetime") type = "date";
          if (type === "boolean") type = "bool";
          if (type === "varchar" || type === "string") type = "text";

          return { 
            ...col, 
            id: colId, 
            type: type, // Now strictly matches your dropdown options
            isPrimary: col.is_primary_key || false,
            isUnique: false,
            isNullable: false
          };
        }),
      };
    });

    // 2. Relationships: Fix Nesting for Lines
    const newRelationships = (data.relationships || []).map((rel: any) => {
      const fromTableId = tableIdMap.get(rel.from_table);
      const toTableId = tableIdMap.get(rel.to_table);
      
      // Look up Column IDs (Backend sends names, Store needs IDs)
      let fromColId = colIdMap.get(`${rel.from_table}.${rel.from_column}`);
      let toColId = colIdMap.get(`${rel.to_table}.${rel.to_column}`);

      // Fallback: Link to 'id' if AI Hallucinated a column name
      if (!fromColId) fromColId = colIdMap.get(`${rel.from_table}.id`);
      if (!toColId) toColId = colIdMap.get(`${rel.to_table}.id`);

      if (!fromTableId || !toTableId || !fromColId || !toColId) return null;

      return {
        id: crypto.randomUUID(),
        from: {
          tableId: fromTableId,
          columnId: fromColId
        },
        to: {
          tableId: toTableId,
          columnId: toColId
        },
        type: rel.type || "1:N"
      };
    }).filter(Boolean);

    return { tables: newTables, relations: newRelationships };
  };

  const handleGenerate = async () => {
    if (!file) return;

    setLoading(true);
    const toastId = toast.loading("AI is analyzing structure...");

    try {
      // 1. Get Strict JSON from Backend
      const rawData = await ApiService.generateSchema(file);
      
      // 2. Adapt for UI (Layout + IDs)
      const cleanData = adaptSchema(rawData);
      
      toast.dismiss(toastId);
      toast.success("Schema imported successfully!");
      
      onSuccess(cleanData);
      onClose();

    } catch (err: any) {
      console.error("Generation Failed:", err);
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to generate schema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Image to Schema</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div 
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={`relative group cursor-pointer border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-all overflow-hidden ${
              file ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <input 
              ref={inputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
            />

            {preview ? (
              <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500 group-hover:text-zinc-400 transition-colors">
                <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800 group-hover:border-zinc-700 shadow-xl">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs font-medium">Click or Drag Image Here</p>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!file || loading}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all ${
              !file || loading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/20 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Schema</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}