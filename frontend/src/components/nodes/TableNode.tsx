import React, { useRef, useState } from "react";
import { useDBStore, type DBTable } from "../../store/dbStore";
import { X, Key, Fingerprint, Plus, Trash2 } from "lucide-react";

interface Props {
  table: DBTable;
}

// ⚠️ MUST MATCH RELATIONS_LAYER CONSTANTS EXACTLY
const ROW_HEIGHT = 32;

export default function TableNode({ table }: Props) {
  // Store Actions
  const updatePos = useDBStore((s) => s.updateTablePosition);
  const addColumn = useDBStore((s) => s.addColumn);
  const updateColumn = useDBStore((s) => s.updateColumn);
  const removeColumn = useDBStore((s) => s.removeColumn);
  const renameTable = useDBStore((s) => s.renameTable);
  const removeTable = useDBStore((s) => s.removeTable);
  const toggleColumnFlag = useDBStore((s) => s.toggleColumnFlag);
  
  // Relation Actions
  const startRelation = useDBStore((s) => s.startRelation);
  const commitRelation = useDBStore((s) => s.commitRelation);
  const relations = useDBStore((s) => s.relations);
  
  // Selection
  const selectTable = useDBStore((s) => s.selectTable);
  const selected = useDBStore((s) => s.selected);
  const isSelected = selected.includes(table.id);

  // Snapping & Refs
  const GRID = 20;
  const snap = (value: number) => Math.round(value / GRID) * GRID;
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // --- RENAMING STATE ---
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(table.name);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Manual Click Timer for robust double-click detection
  const lastClickTime = useRef<number>(0);

  const startEditing = () => {
    setEditing(true);
    setTempName(table.name);
    setTimeout(() => {
        if(inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); 
        }
    }, 0);
  };

  const finishEditing = () => {
    if (tempName.trim()) {
        renameTable(table.id, tempName.trim());
    } else {
        setTempName(table.name); 
    }
    setEditing(false);
  };

  const onAnyPointerDown = (e: React.PointerEvent) => {
    const additive = e.shiftKey;
    selectTable(table.id, additive);
  };

  const onBodyPointerDown = (e: React.PointerEvent) => {
    if (editing) return;

    // Manual Double Click Detection
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
        startEditing();
        return; 
    }
    lastClickTime.current = now;
    
    const target = e.target as HTMLElement;
    if (target.closest("input,select,button,textarea")) return;

    // Start Dragging
    useDBStore.getState().recordHistory();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = table.x ?? 0;
    const initialY = table.y ?? 0;
    
    // Adjust for current zoom level if needed, or assume 1:1 for delta
    // If your canvas scales, you might need: const zoom = useDBStore.getState().viewport.scale;
    
    nodeRef.current?.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Note: If you have zoom, divide dx/dy by scale here
      updatePos(table.id, snap(initialX + dx), snap(initialY + dy));
    };

    const up = () => {
      nodeRef.current?.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={nodeRef}
      onPointerDown={onAnyPointerDown}
      className={`
        table-node pointer-events-auto cursor-default
        absolute w-[250px] rounded-lg bg-[#18181b] border shadow-2xl transition-all duration-200
        flex flex-col z-10
        ${isSelected 
          ? "border-violet-500 ring-1 ring-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]" 
          : "border-zinc-800 hover:border-zinc-700"
        }
      `}
      style={{ 
        left: table.x ?? 0, 
        top: table.y ?? 0,
        // Ensure smooth movement but not during drag if possible (optional)
      }}
    >
      {/* --- HEADER --- */}
      <div 
        className={`h-10 border-b border-white/5 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing rounded-t-lg transition-colors ${
            isSelected ? "bg-violet-500/10" : "bg-zinc-900/50"
        }`}
        onPointerDown={onBodyPointerDown}
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
          {/* Icon */}
          <div className={`p-1 rounded shrink-0 ${isSelected ? "bg-violet-500" : "bg-zinc-700"}`}>
             <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          
          <div className="flex-1 min-w-0">
             {editing ? (
               <input
                 ref={inputRef}
                 type="text"
                 value={tempName}
                 onChange={(e) => setTempName(e.target.value)}
                 onBlur={finishEditing}
                 onKeyDown={(e) => {
                    if (e.key === "Enter") finishEditing();
                    if (e.key === "Escape") {
                        setTempName(table.name);
                        setEditing(false);
                    }
                 }}
                 onPointerDown={(e) => e.stopPropagation()}
                 className="bg-black/50 text-white text-sm font-bold w-full px-1 rounded outline-none border border-violet-500/50"
               />
             ) : (
               <span className="text-sm font-bold text-zinc-100 truncate block select-none">
                 {table.name}
               </span>
             )}
          </div>
        </div>

        {/* Delete Table Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Delete table?")) removeTable(table.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded text-zinc-500 hover:text-red-400 shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* --- COLUMNS --- */}
      <div className="flex flex-col bg-[#18181b] rounded-b-lg">
        {table.columns.map((col) => {
            // Check if this column is connected
            const isConnected = relations.some(
                r => r.from.columnId === col.id || r.to.columnId === col.id
            );

            return (
              <div 
                key={col.id} 
                className="group/col relative flex items-center px-3 border-b border-white/5 last:border-0 hover:bg-white/5"
                style={{ height: ROW_HEIGHT }} // ⚠️ CRITICAL: Enforce 32px height
              >
                {/* 1. LEFT HANDLE */}
                <Handle 
                    side="left" 
                    isConnected={isConnected}
                    onMouseDown={() => startRelation(table.id, col.id)}
                    onMouseUp={() => commitRelation(table.id, col.id)}
                />

                {/* 2. FLAGS (PK/Unique) */}
                <div className="flex items-center gap-1 mr-2 shrink-0">
                   <button
                     onClick={(e) => { e.stopPropagation(); toggleColumnFlag(table.id, col.id, "isPrimary"); }}
                     className={`transition-colors ${col.isPrimary ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
                     title="Primary Key"
                   >
                     <Key size={12} className={col.isPrimary ? "fill-amber-400" : ""} />
                   </button>
                   <button
                     onClick={(e) => { e.stopPropagation(); toggleColumnFlag(table.id, col.id, "isUnique"); }}
                     className={`transition-colors ${col.isUnique ? "text-blue-400" : "text-zinc-700 hover:text-zinc-500"}`}
                     title="Unique Constraint"
                   >
                     <Fingerprint size={12} />
                   </button>
                </div>

                {/* 3. NAME INPUT */}
                <input 
                  value={col.name}
                  onChange={(e) => updateColumn(table.id, col.id, "name", e.target.value)}
                  className="bg-transparent text-zinc-300 text-xs font-medium flex-1 w-0 outline-none focus:text-white placeholder:text-zinc-600 cursor-text"
                  placeholder="column"
                  onPointerDown={(e) => e.stopPropagation()} 
                />

                {/* 4. TYPE SELECT */}
                <select
                  value={col.type}
                  onChange={(e) => updateColumn(table.id, col.id, "type", e.target.value)}
                  className="bg-transparent text-violet-400 text-[10px] uppercase font-bold outline-none cursor-pointer hover:text-violet-300 text-right w-14 appearance-none"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {["int", "text", "uuid", "date", "bool", "json", "float"].map(t => (
                      <option key={t} className="bg-zinc-900 text-zinc-300" value={t}>{t}</option>
                  ))}
                </select>

                {/* 5. NULLABLE TOGGLE */}
                <button
                   onClick={() => toggleColumnFlag(table.id, col.id, "isNullable")}
                   className={`ml-1 px-1 rounded text-[9px] font-bold transition-colors ${col.isNullable ? "text-emerald-400 bg-emerald-400/10" : "text-zinc-700 hover:text-zinc-500"}`}
                   title="Nullable"
                >
                   ?
                </button>

                {/* 6. DELETE COLUMN */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColumn(table.id, col.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ml-1 opacity-0 group-hover/col:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>

                {/* 7. RIGHT HANDLE */}
                <Handle 
                    side="right" 
                    isConnected={isConnected}
                    onMouseDown={() => startRelation(table.id, col.id)}
                    onMouseUp={() => commitRelation(table.id, col.id)}
                />
              </div>
            );
        })}

        {/* ADD COLUMN BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            addColumn(table.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full flex items-center justify-center gap-2 h-8 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-b-lg transition-colors border-t border-white/5"
        >
          <Plus size={12} />
          <span>Add Column</span>
        </button>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

const Handle = ({ side, onMouseDown, onMouseUp, isConnected }: any) => (
    <div 
        className={`
            absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full cursor-crosshair z-20 transition-all border border-zinc-900
            ${side === 'left' ? '-left-[5px]' : '-right-[5px]'}
            ${isConnected 
                ? "bg-violet-500 scale-100" 
                : "bg-zinc-600 opacity-0 group-hover/col:opacity-100 scale-75 hover:scale-125 hover:bg-white"
            }
        `}
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(); }}
        onMouseUp={(e) => { e.stopPropagation(); onMouseUp(); }}
    />
);