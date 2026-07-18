export type UserRole = "admin" | "leader" | "cashier" | "staff";

export interface PublicUser {
  id: number;
  full_name: string;
  email: string;
  roles: UserRole[];
  is_active: boolean;
  branch_id: number | null;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseData {
  user: PublicUser;
  access_token: string;
  refresh_token: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface RefreshResponseData {
  access_token: string;
  refresh_token: string;
}
