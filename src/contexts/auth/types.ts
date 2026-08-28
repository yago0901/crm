import { User } from "firebase/auth";
import { UserLevel } from "../../types/user";

export type { UserLevel };

export interface IAuthContextType {
  currentUser: User | null;
  userLevel: UserLevel | null;
  companyId: string | null;
  modules: string[];
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}
