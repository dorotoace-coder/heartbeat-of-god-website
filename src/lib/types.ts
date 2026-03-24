export type UserRole = 'owner' | 'pastor' | 'manager' | 'leader';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  department_id: string | null;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}
