// src/lib/cloudIO.ts
import { supabaseClient as supabase } from "./supabaseClient";
import { useDBStore } from "../store/dbStore";
import { ProjectCompiler, type ProjectData } from "./compiler"; // Uses your existing compiler

/**
 * SAVES the current workstation to Supabase
 * @param projectId - The UUID of the project in Supabase
 * @param name - (Optional) Update the project name
 */
export async function saveProjectToCloud(projectId: string, name?: string) {
  // 1. Get current state from store
  const state = useDBStore.getState();

  // 2. Prepare raw data
  const rawData = {
    tables: state.tables,
    relations: state.relations,
    viewport: state.viewport,
  };

  // 3. RUN COMPILER (Safety Check)
  // This ensures we never save corrupted data to the DB
  const compilation = ProjectCompiler.compile(rawData);

  if (!compilation.success) {
    console.error("Save failed validation:", compilation.diagnostics);
    throw new Error("Project has critical errors. Cannot save.");
  }

  // 4. Send to Supabase
  const updatePayload: any = {
    diagram_data: compilation.patchedData, 
    updated_at: new Date().toISOString(),
    // Store the count separately for fast Dashboard loading
    tables_count: compilation.patchedData.tables.length 
  };

  if (name) updatePayload.name = name;

  const { error } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}

/**
 * LOADS a project from Supabase into the Store
 * @param projectId - The UUID to fetch
 * @returns The name of the project
 */
export async function loadProjectFromCloud(projectId: string) {
  // 1. Fetch from DB
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !data) {
    throw new Error("Project not found.");
  }

  // 2. Extract Data
  const loadedData = data.diagram_data as ProjectData;

  // 3. Run Compiler (Safety Check for incoming data)
  const compilation = ProjectCompiler.compile(loadedData);
  const cleanData = compilation.patchedData;

  // 4. Load into Global Store
  useDBStore.setState({
    tables: cleanData.tables || [],
    relations: cleanData.relations || [],
    viewport: cleanData.viewport || { x: 0, y: 0, scale: 1 },
    selected: [],
    selectedRelationId: null,
    activeLink: null,
  });

  return data.name; // Return name for the UI Header
}