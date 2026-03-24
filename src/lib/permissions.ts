"use client";

import { createContext, useContext } from "react";
import { UserRole } from "./types";

// ─── Role Hierarchy ──────────────────────────────────────
// Higher number = more permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  pastor: 3,
  manager: 2,
  leader: 1,
};

// ─── Navigation Permissions ──────────────────────────────
// Minimum role level required to see each sidebar item
const NAV_MIN_LEVEL: Record<string, number> = {
  overview: 1,  // Everyone
  members: 2,   // Manager+
  events: 1,    // Everyone (leader = read-only, enforced in component)
  media: 1,     // Everyone (leader = read-only, enforced in component)
  settings: 3,  // Pastor+ (System Rules)
};

// ─── Action Permissions ──────────────────────────────────
// Minimum role level required for each granular action
const ACTION_MIN_LEVEL: Record<string, number> = {
  // Members
  "members.view": 2,
  "members.add": 2,
  "members.edit": 2,
  "members.toggleStatus": 2,
  "members.delete": 3,

  // Events
  "events.view": 1,
  "events.create": 2,
  "events.edit": 2,

  // Media
  "media.view": 1,
  "media.upload": 2,
  "media.delete": 3,
  "media.share": 1,

  // System
  "settings.view": 3,
  "broadcast": 3,
};

// ─── Helper Functions ────────────────────────────────────

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

/** Can this role see this sidebar nav item? */
export function hasNavAccess(role: UserRole, navId: string): boolean {
  const minLevel = NAV_MIN_LEVEL[navId];
  if (minLevel === undefined) return false;
  return getRoleLevel(role) >= minLevel;
}

/** Can this role perform this specific action? */
export function canPerformAction(role: UserRole, action: string): boolean {
  const minLevel = ACTION_MIN_LEVEL[action];
  if (minLevel === undefined) return false;
  return getRoleLevel(role) >= minLevel;
}

// ─── Admin Context ───────────────────────────────────────
// Shares the current user's role across the admin layout tree

interface AdminContextValue {
  role: UserRole;
}

export const AdminContext = createContext<AdminContextValue>({ role: "leader" });

export function useAdminRole(): UserRole {
  return useContext(AdminContext).role;
}
