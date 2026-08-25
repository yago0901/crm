import { User } from "firebase/auth";

export type UserLevel = "User" | "Admin";

export interface IAuthContextType {
  currentUser: User | null;
  userLevel: UserLevel | null;
  companyId: string | null;
  modules: string[];
  mustChangePassword: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}
