"use client";

import { useState, useRef, useEffect } from "react";
import { Users, Search, UserPlus, MoreHorizontal, Mail, Shield, X, Edit3, Trash2, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";
import { useAdminRole, canPerformAction } from "@/lib/permissions";

interface Member {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  joined: string;
}

const INITIAL_MEMBERS: Member[] = [
  { id: 1, name: "Sarah Jenkins", email: "sarah.j@example.com", role: "Member", status: "Active", joined: "2024-01-15" },
  { id: 2, name: "David Chen", email: "d.chen@example.com", role: "Elder", status: "Active", joined: "2023-11-20" },
  { id: 3, name: "Michael Ross", email: "m.ross@example.com", role: "Member", status: "Inactive", joined: "2024-02-01" },
  { id: 4, name: "Elena Rodriguez", email: "elena.r@example.com", role: "Deacon", status: "Active", joined: "2023-09-12" },
];

const ROLE_OPTIONS = ["Member", "Elder", "Deacon", "Usher", "Worship Leader", "Youth Leader", "Pastor"];

// ─── Action Dropdown ─────────────────────────────────
function ActionDropdown({ member, onEdit, onToggleStatus, onDelete }: {
  member: Member;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const role = useAdminRole();
  const canEdit = canPerformAction(role, "members.edit");
  const canToggle = canPerformAction(role, "members.toggleStatus");
  const canDelete = canPerformAction(role, "members.delete");

  // If the user can't do ANY action, don't show the dropdown at all
  if (!canEdit && !canToggle && !canDelete) return null;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {canEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors"
            >
              <Edit3 size={14} />
              Edit Details
            </button>
          )}
          {canToggle && (
            <button
              onClick={() => { onToggleStatus(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 transition-colors"
            >
              {member.status === "Active" ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
              {member.status === "Active" ? "Deactivate" : "Activate"}
            </button>
          )}
          {canDelete && (
            <>
              <div className="border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={() => { onDelete(); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={14} />
                Remove Member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add / Edit Member Modal ─────────────────────────
function MemberModal({ member, onClose, onSave }: {
  member: Member | null; // null = Add new
  onClose: () => void;
  onSave: (data: { name: string; email: string; role: string }) => void;
}) {
  const [name, setName] = useState(member?.name || "");
  const [email, setEmail] = useState(member?.email || "");
  const [role, setRole] = useState(member?.role || "Member");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const isEdit = !!member;

  const handleSubmit = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Full name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Enter a valid email.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({ name: name.trim(), email: email.trim(), role });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isEdit ? "Edit Member" : "Add New Member"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? "Update this member's information." : "Register a new member to the congregation."}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
              placeholder="e.g. John Doe"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-50 dark:bg-slate-950 ${
                errors.name ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: undefined })); }}
              placeholder="e.g. john@church.org"
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-50 dark:bg-slate-950 ${
                errors.email ? "border-red-400 dark:border-red-600" : "border-slate-200 dark:border-slate-700"
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ministry Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-slate-50 dark:bg-slate-950 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all pr-10"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            {isEdit ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ───────────────────────────────────────
export function MembersView() {
  const role = useAdminRole();
  const canAdd = canPerformAction(role, "members.add");
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddOrEdit = (data: { name: string; email: string; role: string }) => {
    if (editingMember) {
      // Edit existing
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...data } : m));
      showToast(`✓ ${data.name}'s profile updated.`);
    } else {
      // Add new
      const newMember: Member = {
        id: Date.now(),
        name: data.name,
        email: data.email,
        role: data.role,
        status: "Active",
        joined: new Date().toISOString().split("T")[0],
      };
      setMembers(prev => [newMember, ...prev]);
      showToast(`✓ ${data.name} added to the congregation.`);
    }
    setModalOpen(false);
    setEditingMember(null);
  };

  const handleToggleStatus = (id: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const newStatus = m.status === "Active" ? "Inactive" : "Active";
        showToast(`${m.name} is now ${newStatus}.`);
        return { ...m, status: newStatus };
      }
      return m;
    }));
  };

  const handleDelete = (id: number) => {
    const member = members.find(m => m.id === id);
    setMembers(prev => prev.filter(m => m.id !== id));
    showToast(`${member?.name} has been removed.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 italic flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Congregation Directory
          </h1>
          <p className="text-sm text-slate-500">Manage ministry members and their access levels.</p>
        </div>
        {canAdd && (
          <button
            onClick={() => { setEditingMember(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
          >
            <UserPlus size={18} />
            Add New Member
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase tracking-widest font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="text-slate-400 font-medium">No members found.</p>
                    <p className="text-xs text-slate-300 mt-1">Try a different search term or add a new member.</p>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                          {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{member.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail size={10} />
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                        <Shield size={12} className="text-blue-500" />
                        {member.role}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        member.status === "Active"
                          ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {member.joined}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ActionDropdown
                        member={member}
                        onEdit={() => { setEditingMember(member); setModalOpen(true); }}
                        onToggleStatus={() => handleToggleStatus(member.id)}
                        onDelete={() => handleDelete(member.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <MemberModal
          member={editingMember}
          onClose={() => { setModalOpen(false); setEditingMember(null); }}
          onSave={handleAddOrEdit}
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
