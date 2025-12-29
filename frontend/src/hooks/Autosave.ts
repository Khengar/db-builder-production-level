import { useEffect, useRef } from 'react';
import { useDBStore } from '../store/dbStore';

const DEBOUNCE_DELAY = 2000; 

export const useAutoSave = (projectId: string) => {
  const { tables, relations, setSaveStatus } = useDBStore();
  const timeoutRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Safety Check: Don't save if there is no Project ID
    if (!projectId) return; 

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus('saving');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        // Use the dynamic projectId in the URL
        await fetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tables, relations }),
        });

        setSaveStatus('saved');
      } catch (error) {
        console.error("Save failed", error);
        setSaveStatus('error');
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tables, relations, projectId, setSaveStatus]); 
};