import { ReactNode } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Settings, 
  CalendarDays,
  Menu
} from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="font-serif italic text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-amber-500">
            HBG Pulse OS
          </span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-400 font-medium rounded-xl">
            <LayoutDashboard size={20} />
            Command Center
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
            <Users size={20} />
            Members
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
            <CalendarDays size={20} />
            Events Engine
          </Link>
          <Link href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
            <Video size={20} />
            Media Vault
          </Link>
        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
            <Settings size={20} />
            System Rules
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600">
              <Menu size={24} />
            </button>
            <h1 className="font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">System Overview</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              A
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
