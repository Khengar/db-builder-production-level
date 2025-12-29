import { useEffect, useRef, useCallback } from 'react';
import { useDBStore } from '../store/dbStore';
import { supabaseClient as supabase } from '../lib/supabaseClient';

const AUTOSAVE_INTERVAL = 10 * 60 * 1000; 

export const useProjectSave = (projectId: string) => {
  const { tables, relations, setSaveStatus } = useDBStore();
  
  // 1. Refs to hold the LATEST data immediately (Solves the Stale State issue)
  const stateRef = useRef({ tables, relations });
  const projectIdRef = useRef(projectId);
  const isDirty = useRef(false);

  // Update refs whenever data changes
  useEffect(() => {
    stateRef.current = { tables, relations };
    projectIdRef.current = projectId;
    
    // Mark as dirty if it's not the initial load
    if (tables.length > 0 || relations.length > 0) { 
       // (You might want a more sophisticated check for 'initial load' here)
       isDirty.current = true;
       setSaveStatus('unsaved');
    }
  }, [tables, relations, projectId, setSaveStatus]);


  // 2. The Save Function (Reads from Refs, so it never needs to be recreated)
  const saveProject = useCallback(async () => {
  const currentProjectId = projectIdRef.current;
  const currentData = stateRef.current;

  // 🔍 DEBUG LOGS: Tell us exactly what the hook sees
  console.log("---- SAVE ATTEMPT ----");
  console.log("Project ID:", currentProjectId);
  console.log("Tables:", currentData.tables.length);
  
  if (!currentProjectId) {
    console.error("❌ ABORTING: Project ID is missing! Check your URL.");
    setSaveStatus('error'); // Show red badge so you know it failed
    return;
  }

  setSaveStatus('saving');
  
  try {
    console.log("💾 Sending data to Supabase...");
    
    const { error } = await supabase
      .from('projects')
      .update({ 
        diagram_data: currentData, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', currentProjectId);

    if (error) throw error;

    setSaveStatus('saved');
    isDirty.current = false;
    console.log("✅ Save Success");
    
  } catch (error) {
    console.error("❌ Supabase Error:", error);
    setSaveStatus('error');
  }
}, [setSaveStatus]);

  // 3. Global Keyboard Listener (Attached ONCE, never removed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CTRL+S (Windows/Linux) or CMD+S (Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); // Stop browser 'Save Page'
        console.log("⌨️ Ctrl+S Detected");
        saveProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject]); // This dependency is now stable


  // 4. Auto-Save Interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty.current) {
        console.log("⏰ Auto-Save Timer Triggered");
        saveProject();
      }
    }, AUTOSAVE_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [saveProject]);
};