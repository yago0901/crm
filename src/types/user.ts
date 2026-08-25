import { Timestamp } from "firebase/firestore";

export type UserLevel = "User" | "Admin";

export interface IUserProfile {
  uid: string;
  companyId: string;
  email: string;
  level: UserLevel;
  modules: string[];
  mustChangePassword: boolean;
  createdAt: Timestamp | null;
}
