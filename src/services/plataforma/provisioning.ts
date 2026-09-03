import { Timestamp, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { withNewAuthAccount } from "./secondaryApp";
import { getCompany } from "./companies";
import { generateTempPassword } from "./passwordGenerator";
import { ALL_MODULE_KEYS } from "../shared/modules";
import { auth } from "../shared/firebase";

const TRIAL_MAX_USERS = 5;
const TRIAL_DAYS = 30;
const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

function stripDiacritics(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_DIACRITICS_START || code > COMBINING_DIACRITICS_END;
    })
    .join("");
}

export function slugify(name: string): string {
  return stripDiacritics(name.normalize("NFD"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function findAvailableSlug(companyName: string): Promise<string> {
  const base = slugify(companyName) || "empresa";
  let candidate = base;
  let suffix = 2;

  while (await getCompany(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export interface IProvisionCompanyInput {
  companyName: string;
  slugHint?: string;
  username: string;
  email: string;
  skipAutoSignIn?: boolean;
}

export interface IProvisionedAccount {
  companyId: string;
  slug: string;
  username: string;
  login: string;
  tempPassword: string;
  autoSignedIn: boolean;
}

export async function provisionCompanyWithPrimaryAccount(
  input: IProvisionCompanyInput
): Promise<IProvisionedAccount> {
  const slug = await findAvailableSlug(input.slugHint || input.companyName);
  const tempPassword = generateTempPassword();
  const login = `${slug}.${input.username}`;

  await withNewAuthAccount(input.email, tempPassword, async ({ uid, db }) => {
    try {
      await setDoc(doc(db, "companies", slug), {
        slug,
        name: input.companyName,
        plan: "trial",
        trialEndsAt: Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        maxUsers: TRIAL_MAX_USERS,
        userCount: 1,
        primaryUserId: uid,
        primaryEmail: input.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      throw new Error(`Falha ao criar a empresa (companies): ${(err as Error).message}`);
    }

    try {
      await setDoc(doc(db, "users", uid), {
        companyId: slug,
        email: input.email,
        login,
        level: "Admin",
        modules: [...ALL_MODULE_KEYS],
        mustChangePassword: true,
        employeeId: null,
        disabled: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      throw new Error(`Falha ao criar o perfil do usuário (users): ${(err as Error).message}`);
    }

    try {
      await setDoc(doc(db, "logins", login), {
        email: input.email,
      });
    } catch (err) {
      throw new Error(`Falha ao criar o login (logins): ${(err as Error).message}`);
    }
  });

  let autoSignedIn = false;
  if (!input.skipAutoSignIn) {
    autoSignedIn = true;
    try {
      await signInWithEmailAndPassword(auth, input.email, tempPassword);
    } catch {
      autoSignedIn = false;
    }
  }

  return { companyId: slug, slug, username: input.username, login, tempPassword, autoSignedIn };
}
