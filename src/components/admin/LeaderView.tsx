"use client";

import { useState } from "react";
import { Users, Calendar, ClipboardCheck, Plus, Settings, MessageSquare, Briefcase, X, Check } from "lucide-react";
import { PulseState } from "@/lib/pulse";

interface LeaderViewProps {
  pulse: PulseState;
  departmentName?: string;
}

interface Task {
  id: number;
  label: string;
  done: boolean;
}

// ─── Add Update Modal ────────────────────────────────────
function AddUpdateModal({ departmentName, onClose, onSave }: {
  departmentName: string;
  onClose: () => void;
  onSave: (update: string) => void;
}) {
  const [update, setUpdate] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{departmentName} Update</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
        </div>
        <div className="px-8 py-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Update Message</label>
          <textarea value={update} onChange={(e) => setUpdate(e.target.value)} rows={4} placeholder="What's the latest from your department?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" />
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { if (update.trim()) onSave(update.trim()); }} disabled={!update.trim()}
            className="px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none">
            Post Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Task Modal ──────────────────────────────────────
function AddTaskModal({ onClose, onSave }: { onClose: () => void; onSave: (label: string) => void }) {
  const [label, setLabel] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"><X size={18} /></button>
        </div>
        <div className="px-8 py-6">
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Organize choir rehearsal"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { if (label.trim()) onSave(label.trim()); }} disabled={!label.trim()}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none">Add Task</button>
        </div>
      </div>
    </div>
  );
}

// ─── Task Note Popover ───────────────────────────────────
function TaskNoteModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><MessageSquare size={16} className="text-blue-500" />Note for: {task.label}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><X size={16} /></button>
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note or comment..."
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
          <button onClick={() => { if (note.trim()) onSave(note.trim()); }} disabled={!note.trim()}
            className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none">Save Note</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────────
export function LeaderView({ pulse, departmentName = "Media" }: LeaderViewProps) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, label: "Setup Sound System", done: true },
    { id: 2, label: "Coordinate Photography", done: false },
    { id: 3, label: "Social Media Live Stream", done: false },
  ]);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [noteTask, setNoteTask] = useState<Task | null>(null);
  const [updates, setUpdates] = useState<{ text: string; time: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newDone = !t.done;
        showToast(newDone ? `✓ "${t.label}" completed.` : `"${t.label}" reopened.`);
        return { ...t, done: newDone };
      }
      return t;
    }));
  };

  const activeTasks = tasks.filter(t => !t.done).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase className="text-emerald-500 w-8 h-8" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">{departmentName} Department Coordination</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setUpdateModalOpen(true)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02]">
            <Plus size={18} /> Add Update
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
             <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
               <Users size={20} />
             </div>
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Team Members</p>
           </div>
           <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">12 Active</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
             <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
               <Calendar size={20} />
             </div>
             <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Upcoming Duties</p>
           </div>
           <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Sunday Service</h3>
        </div>
      </div>

      {/* Recent Updates */}
      {updates.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-500" /> Recent Updates
          </h3>
          <div className="space-y-3">
            {updates.map((u, i) => (
              <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-800 dark:text-slate-100">{u.text}</p>
                <p className="text-[10px] text-slate-400 mt-1">{u.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
         <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <ClipboardCheck size={20} className="text-blue-500" /> Departmental Tasks
             <span className="text-xs font-medium text-slate-400 ml-2">({activeTasks} remaining)</span>
           </h3>
           <button onClick={() => setAddTaskOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-blue-500">
             <Plus size={18} />
           </button>
         </div>
         <div className="space-y-3">
           {tasks.map((task) => (
             <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200">
               <div className="flex items-center gap-4">
                 <button onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-blue-400'}`}>
                   {task.done && <Check size={14} className="text-white" />}
                 </button>
                 <span className={`font-bold text-sm transition-all ${task.done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>{task.label}</span>
               </div>
               <button onClick={() => setNoteTask(task)} className="text-slate-300 hover:text-blue-500 transition-colors">
                 <MessageSquare size={16} />
               </button>
             </div>
           ))}
           {tasks.length === 0 && (
             <div className="text-center py-8 text-slate-400">
               <p className="font-medium">No tasks yet.</p>
               <p className="text-xs mt-1">Click + to add a new task.</p>
             </div>
           )}
         </div>
      </div>

      {/* Modals */}
      {updateModalOpen && (
        <AddUpdateModal
          departmentName={departmentName}
          onClose={() => setUpdateModalOpen(false)}
          onSave={(text) => {
            setUpdates(prev => [{ text, time: new Date().toLocaleString() }, ...prev]);
            setUpdateModalOpen(false);
            showToast("✓ Update posted.");
          }}
        />
      )}
      {addTaskOpen && (
        <AddTaskModal
          onClose={() => setAddTaskOpen(false)}
          onSave={(label) => {
            setTasks(prev => [...prev, { id: Date.now(), label, done: false }]);
            setAddTaskOpen(false);
            showToast(`✓ "${label}" added.`);
          }}
        />
      )}
      {noteTask && (
        <TaskNoteModal
          task={noteTask}
          onClose={() => setNoteTask(null)}
          onSave={(note) => { setNoteTask(null); showToast(`Note saved for "${noteTask.label}".`); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl shadow-2xl font-bold text-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          {toast}
        </div>
      )}
    </div>
  );
}
