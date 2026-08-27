import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { withNewAuthAccount } from "./secondaryApp";
import { getCompany } from "./companies";
import { generateTempPassword } from "./passwordGenerator";
import { ALL_MODULE_KEYS } from "../shared/modules";
import { auth } from "../shared/firebase";

const TRIAL_MAX_USERS = 5;
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
        trialEndsAt: null,
        maxUsers: TRIAL_MAX_USERS,
        userCount: 1,
        primaryUserId: uid,
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
        level: "Admin",
        modules: [...ALL_MODULE_KEYS],
        mustChangePassword: true,
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

  // The account was already created successfully at this point, regardless
  // of what happens below -- signing into the primary app is just a
  // convenience so the caller can drop the person straight into the forced
  // password-change screen instead of showing the temp password. Nobody
  // else was signed in on the primary app before this (self-service signup
  // has no prior session to protect), so this is safe to attempt directly.
  let autoSignedIn = true;
  try {
    await signInWithEmailAndPassword(auth, input.email, tempPassword);
  } catch {
    autoSignedIn = false;
  }

  return { companyId: slug, slug, username: input.username, login, tempPassword, autoSignedIn };
}
