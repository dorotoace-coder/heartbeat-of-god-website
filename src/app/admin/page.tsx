"use client";

import { useEffect, useState } from "react";
import { PulseState } from "@/lib/pulse";
import { Activity, Radio, Users, Banknote, Calendar, Video } from "lucide-react";

export default function AdminDashboard() {
  const [pulse, setPulse] = useState<PulseState | null>(null);
  const [loading, setLoading] = useState(true);

  // Poll the autonomous pulse engine every 5 seconds
  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const res = await fetch("/api/pulse");
        const data = await res.json();
        setPulse(data);
      } catch (err) {
        console.error("Failed to fetch pulse", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPulse();
    const interval = setInterval(fetchPulse, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !pulse) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Activity className="animate-pulse w-12 h-12 text-blue-500" />
        <p>Connecting to The Pulse OS...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Top Automated Status Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Autonomous Uplink Status</h2>
          <div className="flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </div>
            <span className="text-2xl font-semibold text-slate-800 dark:text-slate-100">System Healthy</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium ${pulse.isLive ? 'bg-red-500/10 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            <Radio size={18} className={pulse.isLive ? 'animate-pulse' : ''} />
            {pulse.isLive ? 'Platform is LIVE' : 'Platform Offline'}
          </div>
          <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors active:scale-95">
            Manual Override
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Active Global Users</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-baseline gap-2">
            {pulse.globalMetrics.activeUsers.toLocaleString()}
            <span className="text-xs font-medium text-emerald-500 flex items-center">
              +12 this sec
            </span>
          </h3>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Banknote size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Weekly Giving</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-baseline gap-2">
            ${pulse.globalMetrics.totalGivingThisWeek.toLocaleString()}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 dark:text-white transition-transform group-hover:scale-110">
            <Calendar size={120} />
          </div>
          <p className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-2 relative z-10">Next Scheduled Event</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 relative z-10">{pulse.nextEventName}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium relative z-10">
            {new Date(pulse.nextEventDate).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      {/* Autonomous Content Operations */}
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 pt-4">Autonomous Content Engine</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm col-span-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Automated Sermon of the Day</h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative">
              <img src={pulse.sermonOfTheDay.imageUrl} alt="Sermon" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                  <Video size={20} />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">Currently In Rotation</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pulse.sermonOfTheDay.title}</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Preached by {pulse.sermonOfTheDay.preacher}</p>
              <p className="text-sm text-slate-400 max-w-md">This content was mathematically selected by the Pulse engine based on the current day of the year and automatically deployed to the app frontend.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl text-white flex flex-col justify-center">
          <Activity className="w-10 h-10 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">The Pulse OS runs without human input.</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Everything from live polling, next-event countdowns, scaling server metrics, and distributing daily content is executed continuously by background cron tasks and dynamic hashing functions. 
          </p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-[pulse_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
