"use client";

import { ReactNode, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdminRole, hasNavAccess } from "@/lib/permissions";
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Settings, 
  CalendarDays,
  Menu,
  ChevronRight
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { id: "overview", label: "Command Center", icon: LayoutDashboard, href: "/admin" },
  { id: "members", label: "Members", icon: Users, href: "/admin?view=members" },
  { id: "events", label: "Events Engine", icon: CalendarDays, href: "/admin?view=events" },
  { id: "media", label: "Media Vault", icon: Video, href: "/admin?view=media" },
];

function SidebarContent() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "overview";
  const role = useAdminRole();

  // Filter nav items by role permissions
  const navItems = ALL_NAV_ITEMS.filter(item => hasNavAccess(role, item.id));
  const showSettings = hasNavAccess(role, "settings");

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <span className="font-serif italic text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-amber-500">
          HBG Pulse OS
        </span>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <Link 
              key={item.id}
              href={item.href} 
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-400 font-bold shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600"} />
                {item.label}
              </div>
              {isActive && <ChevronRight size={14} className="opacity-50" />}
            </Link>
          );
        })}
      </nav>
      
      {showSettings && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Link 
            href="/admin?view=settings"
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-colors ${
              currentView === "settings"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Settings size={20} />
            System Rules
          </Link>
        </div>
      )}
    </aside>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans">
      <Suspense fallback={<div className="w-64 bg-white dark:bg-slate-950" />}>
        <SidebarContent />
      </Suspense>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600">
              <Menu size={24} />
            </button>
            <h1 className="font-semibold text-slate-800 dark:text-slate-100 hidden sm:block uppercase tracking-widest text-[10px] opacity-40">System Overview</h1>
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
