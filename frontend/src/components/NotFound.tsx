import { Link } from "react-router-dom";
import { Database, AlertTriangle, Terminal, ArrowLeft, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans flex flex-col items-center justify-center selection:bg-violet-500/30">
      
      {/* Background Ambience (Same as WorkStation) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full p-8 text-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Visual: The "Ghost" Database Node */}
        <div className="relative mb-8 group">
          {/* Glitch Effect Behind */}
          <div className="absolute inset-0 bg-red-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          
          <div className="relative w-32 h-32 bg-zinc-900/90 backdrop-blur-xl border-2 border-dashed border-zinc-700 flex items-center justify-center rounded-2xl shadow-2xl">
            <Database className="w-12 h-12 text-zinc-600 opacity-50" />
            
            {/* 404 Badge */}
            <div className="absolute -top-3 -right-3 bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>404</span>
            </div>
          </div>
        </div>

        {/* Headlines */}
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent mb-2">
          Query Returned 0 Rows
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          The project schema you are trying to fetch has been dropped, moved, or never existed in this timeline.
        </p>

        {/* Fake Terminal / Error Log */}
        <div className="w-full bg-black/40 border border-white/5 rounded-lg p-4 mb-8 text-left font-mono text-xs overflow-hidden">
          <div className="flex items-center gap-1.5 mb-3 border-b border-white/5 pb-2">
            <Terminal size={12} className="text-zinc-600" />
            <span className="text-zinc-600">system_logs.log</span>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">
              <span className="text-violet-500">➜</span> GET /api/projects/:id
            </p>
            <p className="text-zinc-400">
              <span className="text-blue-500">ℹ</span> Verifying ownership keys... <span className="text-green-500">OK</span>
            </p>
            <p className="text-zinc-400">
              <span className="text-blue-500">ℹ</span> Searching indexes...
            </p>
            <p className="text-red-400">
              <span className="text-red-500">✖</span> Error: EntityNotFoundException
            </p>
            <p className="text-red-400 pl-4">
              at query_execution (line: 404)
            </p>
            <p className="animate-pulse text-zinc-600 mt-2">_</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 w-full justify-center">
          <Link to="/dashboard" className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-200"></div>
            <button className="relative flex items-center gap-2 px-6 py-3 bg-zinc-900 ring-1 ring-white/10 rounded-lg leading-none text-zinc-300 hover:text-white transition-colors">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Return to Dashboard</span>
            </button>
          </Link>
          
          <Link to="/">
             <button className="px-6 py-3 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all text-sm font-medium flex items-center gap-2">
               <Home size={16}/>
               <span>Home</span>
             </button>
          </Link>
        </div>

      </div>
    </div>
  );
}