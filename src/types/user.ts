import { Timestamp } from "firebase/firestore";

export type UserLevel = "User" | "Manager" | "Admin";

export interface IUserProfile {
  uid: string;
  companyId: string;
  email: string;
  login: string;
  level: UserLevel;
  modules: string[];
  mustChangePassword: boolean;
  employeeId: string | null;
  /** Optional display name set directly on the account — used for logins
      with no linked employee record (e.g. the company admin). */
  name?: string;
  disabled: boolean;
  createdAt: Timestamp | null;
}
