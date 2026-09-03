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
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../shared/firebase";
import { appendAuditLog, computeChangedFields } from "../shared/auditLog";
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
  const docRef = doc(firestore, "users", uid);
  const before = await getDoc(docRef);
  const beforeData = before.data();

  const batch = writeBatch(firestore);
  batch.update(docRef, { modules });

  if (beforeData && auth.currentUser) {
    const changedFields = computeChangedFields(beforeData, { modules });
    if (changedFields.length > 0) {
      appendAuditLog(batch, {
        companyId: beforeData.companyId,
        entityType: "users",
        entityId: uid,
        entitySummary: beforeData.login ?? uid,
        action: "update",
        changedFields,
        owner: { uid: auth.currentUser.uid, name: auth.currentUser.displayName ?? auth.currentUser.email },
      });
    }
  }

  await batch.commit();
}

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
