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
  disabled: boolean;
  createdAt: Timestamp | null;
}
