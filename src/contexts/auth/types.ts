import { User } from "firebase/auth";

export type UserLevel = "User" | "Admin";

export interface IAuthContextType {
  currentUser: User | null;
  userLevel: UserLevel | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
