import { useMemo } from "react";
import { useDBStore } from "../../store/dbStore";

// --- CONSTANTS (Must match TableNode CSS) ---
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 32;
const TABLE_WIDTH = 250;

/**
 * Calculates the start (x1,y1) and end (x2,y2) points for a connection.
 * It determines which side of the table to connect to based on relative positions.
 */
const getSmartAnchors = (from: any, to: any, fromIndex: number, toIndex: number) => {
  // Safe access to coordinates
  const fromX = from?.position?.x ?? from?.x ?? 0;
  const fromY = from?.position?.y ?? from?.y ?? 0;
  const toX = to?.position?.x ?? to?.x ?? 0;
  const toY = to?.position?.y ?? to?.y ?? 0;

  // Calculate distinct row positions
  const y1 = fromY + HEADER_HEIGHT + (fromIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
  const y2 = toY + HEADER_HEIGHT + (toIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);

  let x1, x2;
  const buffer = 30; // Min distance to decide side switching

  // 1. Target is strictly to the RIGHT
  if (toX > fromX + TABLE_WIDTH + buffer) {
    x1 = fromX + TABLE_WIDTH; // Start Right
    x2 = toX;                 // End Left
  } 
  // 2. Target is strictly to the LEFT
  else if (toX < fromX - TABLE_WIDTH - buffer) {
    x1 = fromX;               // Start Left
    x2 = toX + TABLE_WIDTH;   // End Right
  } 
  // 3. Stacked / Overlapping (fallback to Right-to-Right or standard)
  else {
    x1 = fromX + TABLE_WIDTH;
    x2 = toX + TABLE_WIDTH;
  }

  return { x1, y1, x2, y2 };
};

export default function RelationsLayer() {
  const tables = useDBStore((s) => s.tables);
  const relations = useDBStore((s) => s.relations);
  const selectedRelationId = useDBStore((s) => s.selectedRelationId);
  const selectRelation = useDBStore((s) => s.selectRelation);

  const edges = useMemo(() => {
    return relations.map((rel) => {
      const fromTable = tables.find((t) => t.id === rel.from.tableId);
      const toTable = tables.find((t) => t.id === rel.to.tableId);

      // 1. Safety Check: Tables must exist
      if (!fromTable || !toTable) return null;

      // 2. Find Column Indices
      const fromColIndex = fromTable.columns.findIndex((c) => c.id === rel.from.columnId);
      const toColIndex = toTable.columns.findIndex((c) => c.id === rel.to.columnId);

      // 3. BUG FIX: If column not found (index -1), DO NOT RENDER.
      // This prevents the "shifting to top" bug during updates.
      if (fromColIndex === -1 || toColIndex === -1) {
        return null; 
      }

      // 4. Calculate Coordinates
      const { x1, y1, x2, y2 } = getSmartAnchors(fromTable, toTable, fromColIndex, toColIndex);

      // 5. Calculate Smooth Bezier Curve
      // "curvature" defines how far out the line pushes before turning
      const distanceX = Math.abs(x2 - x1);
      const curvature = Math.max(distanceX * 0.4, 60);

      let pathString = "";

      // Standard Curve (Right -> Left)
      if (x1 < x2) {
         pathString = `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;
      } 
      // Reverse Curve (Left -> Right)
      else if (x1 > x2 + TABLE_WIDTH) {
         pathString = `M ${x1} ${y1} C ${x1 - curvature} ${y1}, ${x2 + curvature} ${y2}, ${x2} ${y2}`;
      }
      // Loopback / Stacked (Right -> Right)
      else {
         const loopSize = 100;
         pathString = `M ${x1} ${y1} C ${x1 + loopSize} ${y1}, ${x2 + loopSize} ${y2}, ${x2} ${y2}`;
      }

      return {
        id: rel.id,
        path: pathString,
        isSelected: rel.id === selectedRelationId,
        cardinality: rel.cardinality || 'one-to-one', // default
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    // 6. Sort selected to end (render on top)
    .sort((a) => (a.isSelected ? 1 : -1));

  }, [relations, tables, selectedRelationId]);

  return (
    <svg 
      className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* --- MARKERS --- */}
        {/* 1. Simple Arrow (Gray) */}
        <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#71717a" />
        </marker>
        
        {/* 2. Simple Arrow (Violet) */}
        <marker id="arrow-violet" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6" />
        </marker>

        {/* 3. Crow's Foot (Gray) - The "Many" Symbol */}
        <marker id="crowfoot-gray" markerWidth="14" markerHeight="14" refX="14" refY="7" orient="auto">
           {/* Vertical bar + Trident */}
           <path d="M0,7 L14,7 M14,0 L14,14 M9,3 L14,7 L9,11" stroke="#71717a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </marker>

        {/* 4. Crow's Foot (Violet) - Active */}
        <marker id="crowfoot-violet" markerWidth="14" markerHeight="14" refX="14" refY="7" orient="auto">
           <path d="M0,7 L14,7 M14,0 L14,14 M9,3 L14,7 L9,11" stroke="#8b5cf6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </marker>

        {/* 5. Glow Filter for Active Line */}
        <filter id="glow-line" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {edges.map((edge) => {
         const isMany = edge.cardinality === 'one-to-many';
         
         const markerId = edge.isSelected 
            ? (isMany ? "url(#crowfoot-violet)" : "url(#arrow-violet)")
            : (isMany ? "url(#crowfoot-gray)" : "url(#arrow-gray)");

         const strokeColor = edge.isSelected ? "#8b5cf6" : "#71717a"; // Violet-500 vs Zinc-500

         return (
          <g key={edge.id} className="pointer-events-auto group">
            
            {/* A. HIT BOX (Invisible thick line for easier clicking) */}
            <path
              d={edge.path}
              stroke="transparent"
              strokeWidth="20"
              fill="none"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                selectRelation(edge.id);
              }}
            />

            {/* B. GLOW EFFECT (Underlay, only when selected) */}
            {edge.isSelected && (
              <path
                d={edge.path}
                stroke="#8b5cf6"
                strokeWidth="4"
                strokeOpacity="0.4"
                fill="none"
                style={{ filter: "url(#glow-line)" }}
              />
            )}

            {/* C. VISIBLE LINE (The actual connector) */}
            <path
              d={edge.path}
              stroke={strokeColor}
              strokeWidth={edge.isSelected ? "2" : "1.5"}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd={markerId}
              
              // Only apply dasharray if selected to trigger animation
              // If not selected, use empty string (solid line)
              strokeDasharray={edge.isSelected ? "8 8" : ""} 
              
              className={`transition-all duration-300 pointer-events-none ${
                edge.isSelected ? "animate-liam-flow" : "group-hover:stroke-zinc-400"
              }`}
            />
          </g>
        );
      })}
    </svg>
  );
}