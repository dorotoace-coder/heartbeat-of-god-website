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

export interface Inquiry {
  id: string;
  full_name: string;
  email: string;
  type: string;
  message: string | null;
  phone: string | null;
  category: string | null;
  confidential: boolean;
  area: string | null;
  visit_type: string | null;
  invited_by: string | null;
  prayer_need: string | null;
  status: 'pending' | 'reviewed' | 'contacted';
  created_at: string;
}
