export type UserRole = "admin" | "leader" | "cashier";

export interface User {
  id: number;
  full_name: string;
  email: string;
  roles: UserRole;
  branch_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  branch_id?: number;
  role_code?: UserRole;
}

export interface UpdateUserPayload {
  full_name?: string;
  branch_id?: number;
  role_code?: UserRole;
  is_active?: boolean;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface ResetPasswordPayload {
  new_password: string;
}
