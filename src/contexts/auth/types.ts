import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { UserLevel } from "../../types/user";
import { CompanyPlan } from "../../types/company";

export type { UserLevel };

export interface IAuthContextType {
  currentUser: User | null;
  userLevel: UserLevel | null;
  companyId: string | null;
  companyName: string | null;
  companyPlan: CompanyPlan | null;
  trialEndsAt: Timestamp | null;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
  modules: string[];
  mustChangePassword: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  resetPassword: (loginId: string) => Promise<void>;
}
