import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  getDoc,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { CompanyInput, ICompany } from "../../types/company";

const COLLECTION = "companies";

export const mapCompany = (
  snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>
): ICompany => {
  const data = snap.data() as DocumentData;
  return {
    id: snap.id,
    slug: data.slug,
    name: data.name,
    plan: data.plan,
    trialEndsAt: data.trialEndsAt ?? null,
    maxUsers: data.maxUsers,
    userCount: data.userCount ?? 0,
    primaryUserId: data.primaryUserId,
    primaryEmail: data.primaryEmail ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

export async function createCompany(input: CompanyInput): Promise<string> {
  await setDoc(doc(firestore, COLLECTION, input.slug), {
    ...input,
    userCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return input.slug;
}

export async function getCompany(slug: string): Promise<ICompany | null> {
  const snap = await getDoc(doc(firestore, COLLECTION, slug));
  return snap.exists() ? mapCompany(snap) : null;
}

export async function updateCompany(
  slug: string,
  input: Partial<CompanyInput>
): Promise<void> {
  await updateDoc(doc(firestore, COLLECTION, slug), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToCompanies(
  onChange: (companies: ICompany[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(firestore, COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapCompany)),
    (error) => onError?.(error)
  );
}
