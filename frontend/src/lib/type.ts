export interface Project {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  last_edited: string; // mapped from updated_at
  tables_count: number; // calculated from diagram_data later
}