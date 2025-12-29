import { useEffect, useState, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabaseClient } from "../lib/supabaseClient";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  FolderOpen, 
  Clock, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Loader2,
  LogOut
} from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function Dashboard() {
  const session: any = useOutletContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // --- RENAMING STATE ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // --- MENU STATE ---
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // 1. FETCH PROJECTS
  useEffect(() => {
    fetchProjects();
  }, [session.user.id]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      toast.error("Failed to load projects");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. CREATE PROJECT
  const handleCreate = async () => {
    const id = uuidv4();
    const name = "Untitled Project";
    
    // Optimistic Update
    const newProject: Project = {
      id,
      name,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setProjects([newProject, ...projects]);

    const { error } = await supabaseClient
      .from('projects')
      .insert([{ id, name, user_id: session.user.id }]);

    if (error) {
      toast.error("Failed to create project");
      // Revert on failure
      setProjects(prev => prev.filter(p => p.id !== id));
    } else {
      toast.success("New project created");
      // Automatically enter edit mode for the new project
      startEditing(newProject);
    }
  };

  // 3. RENAME LOGIC
  const startEditing = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setActiveMenuId(null); // Close menu if open
    // Focus input after render
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const saveRename = async () => {
    if (!editingId || !editName.trim()) {
      setEditingId(null);
      return;
    }

    const oldProjects = [...projects];
    // Optimistic Update
    setProjects(projects.map(p => p.id === editingId ? { ...p, name: editName } : p));
    setEditingId(null);

    const { error } = await supabaseClient
      .from('projects')
      .update({ name: editName, updated_at: new Date().toISOString() })
      .eq('id', editingId);

    if (error) {
      toast.error("Failed to rename");
      setProjects(oldProjects); // Revert
    } else {
      toast.success("Project renamed");
    }
  };

  // 4. DELETE LOGIC
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;

    const oldProjects = [...projects];
    setProjects(projects.filter(p => p.id !== id));

    const { error } = await supabaseClient
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete");
      setProjects(oldProjects);
    } else {
      toast.success("Project deleted");
    }
  };

  // 5. SIGN OUT
  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    navigate("/login");
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#09090b] text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-violet-500/30 p-8">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <div>
           <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Dashboard</h1>
           <p className="text-zinc-500 mt-1">Welcome back, {session.user.email}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all w-64"
            />
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* NEW PROJECT CARD */}
          <button 
            onClick={handleCreate}
            className="group flex flex-col items-center justify-center gap-4 h-48 rounded-2xl border border-dashed border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-900/50 transition-all active:scale-95"
          >
            <div className="p-4 rounded-full bg-zinc-900 group-hover:bg-violet-500/10 text-zinc-500 group-hover:text-violet-400 transition-colors">
              <Plus size={24} />
            </div>
            <span className="font-medium text-zinc-400 group-hover:text-zinc-200">New Project</span>
          </button>

          {/* PROJECT LIST */}
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              onClick={() => {
                 // Navigate only if NOT editing and NOT clicking menu
                 if (editingId !== project.id && activeMenuId !== project.id) {
                     navigate(`/workstation/${project.id}`);
                 }
              }}
              className="group relative flex flex-col justify-between h-48 p-5 bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1 transition-all rounded-2xl cursor-pointer"
            >
              {/* Top Section: Icon & Menu */}
              <div className="flex items-start justify-between">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-violet-400">
                  <FolderOpen size={20} />
                </div>

                {/* --- MENU BUTTON --- */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
                        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {/* DROPDOWN MENU */}
                    {activeMenuId === project.id && (
                        <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                        <div className="absolute right-0 top-8 z-20 w-32 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                            <button 
                                onClick={() => startEditing(project)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
                            >
                                <Edit2 size={12} /> Rename
                            </button>
                            <button 
                                onClick={() => handleDelete(project.id)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                        </div>
                        </>
                    )}
                </div>
              </div>

              {/* Middle: Title (Editable) */}
              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                 {editingId === project.id ? (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                         <input 
                            ref={editInputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRename();
                                if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="bg-zinc-950 border border-violet-500/50 rounded-lg px-2 py-1 text-sm text-white w-full outline-none focus:ring-2 focus:ring-violet-500/20"
                         />
                         <button onClick={saveRename} className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-md text-white"><Check size={12}/></button>
                         <button onClick={() => setEditingId(null)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-400"><X size={12}/></button>
                     </div>
                 ) : (
                    <h3 className="font-semibold text-zinc-200 group-hover:text-white truncate">{project.name}</h3>
                 )}
              </div>

              {/* Bottom: Date */}
              <div className="flex items-center gap-2 text-xs text-zinc-600 mt-auto">
                <Clock size={12} />
                <span>{new Date(project.updated_at).toLocaleDateString()}</span>
              </div>

            </div>
          ))}

        </div>
      </div>
    </div>
  );
}