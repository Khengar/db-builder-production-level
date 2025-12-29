import { useRef, useEffect } from 'react';
import { useDBStore } from '../../store/dbStore'; 
import TableNode from '../nodes/TableNode';   
import RelationsLayer from './RelationsLayer'; 

export default function Canvas(){
  const { viewport, tables, setScale } = useDBStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); 
      const ZOOM_SPEED = 0.001;
      const newScale = Math.max(0.1, Math.min(viewport.scale - e.deltaY * ZOOM_SPEED, 5));
      const rect = element.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      setScale(newScale, cursorX, cursorY);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [viewport.scale, setScale]); 

  return (
    <div 
      ref={containerRef}
      // REMOVED: bg-gray-50/50
      // ADDED: bg-transparent just to be safe
      className="w-full h-full overflow-hidden relative bg-transparent" 
      style={{ 
        cursor: 'grab',
        touchAction: 'none'
      }}
    >
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: "0 0", 
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <RelationsLayer />
        {tables.map((table) => (
          <TableNode key={table.id} table={table} />
        ))}
      </div>
    </div>
  );
};