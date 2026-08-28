import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  increment,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "../shared/firebase";
import { getCurrentCompanyId } from "../shared/tenant";
import { getCompany } from "../plataforma/companies";
import { withNewAuthAccount } from "../plataforma/secondaryApp";
import { generateTempPassword } from "../plataforma/passwordGenerator";
import { ModuleKey } from "../shared/modules";
import { IEmployee } from "../../types/employee";
import { IUserProfile } from "../../types/user";

export const mapUserProfile = (snap: QueryDocumentSnapshot<DocumentData>): IUserProfile => {
  const data = snap.data();
  return {
    uid: snap.id,
    companyId: data.companyId,
    email: data.email,
    login: data.login ?? "",
    level: data.level,
    modules: data.modules ?? [],
    mustChangePassword: data.mustChangePassword ?? false,
    employeeId: data.employeeId ?? null,
    disabled: data.disabled ?? false,
    createdAt: data.createdAt ?? null,
  };
};

export async function fetchCompanyUserProfiles(): Promise<IUserProfile[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const snap = await getDocs(
    query(collection(firestore, "users"), where("companyId", "==", companyId))
  );
  return snap.docs.map((d) => mapUserProfile(d as QueryDocumentSnapshot<DocumentData>));
}

export interface ICreatedEmployeeLogin {
  login: string;
  tempPassword: string;
}

export async function createEmployeeLogin(
  employee: IEmployee,
  username: string
): Promise<ICreatedEmployeeLogin> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Nenhuma empresa selecionada.");
  }

  const company = await getCompany(companyId);
  if (!company) {
    throw new Error("Empresa não encontrada.");
  }
  if (company.userCount >= company.maxUsers) {
    throw new Error(
      `Limite de usuários do plano atingido (${company.userCount}/${company.maxUsers}). Fale com o suporte para aumentar o limite.`
    );
  }

  const login = `${companyId}.${username}`;
  const loginRef = doc(firestore, "logins", login);
  const existingLogin = await getDoc(loginRef);
  if (existingLogin.exists()) {
    throw new Error("Esse nome de usuário já está em uso. Escolha outro.");
  }

  const tempPassword = generateTempPassword();

  // Only the raw Auth account is created through the secondary app -- the
  // Firestore writes below happen through the primary app, as the Admin/
  // Manager who's already signed in, so the security rules see their real
  // (existing) profile rather than the brand-new employee's.
  const { uid } = await withNewAuthAccount(employee.email, tempPassword, async ({ uid }) => ({ uid }));

  try {
    await setDoc(doc(firestore, "users", uid), {
      companyId,
      email: employee.email,
      login,
      level: "User",
      modules: [],
      mustChangePassword: true,
      employeeId: employee.id,
      disabled: false,
      createdAt: serverTimestamp(),
    });
    await setDoc(loginRef, { email: employee.email });
    await updateDoc(doc(firestore, "employees", employee.id), { userId: uid });
    await updateDoc(doc(firestore, "companies", companyId), { userCount: increment(1) });
  } catch (err) {
    throw new Error(`Conta criada, mas houve um erro ao concluir o acesso: ${(err as Error).message}`);
  }

  return { login, tempPassword };
}

export async function updateEmployeeModules(uid: string, modules: ModuleKey[]): Promise<void> {
  await updateDoc(doc(firestore, "users", uid), { modules });
}

// Real disable/enable (not just a client-side flag) -- goes through the
// /api/employees/set-access serverless function, the only place that holds
// the Admin SDK credential needed to actually flip the account off.
export async function setEmployeeAccess(targetUid: string, disabled: boolean): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("Nenhum usuário autenticado.");
  }
  const idToken = await auth.currentUser.getIdToken();

  const response = await fetch("/api/employees/set-access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ targetUid, disabled }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Erro ao atualizar o acesso do funcionário.");
  }
}
