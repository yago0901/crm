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
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../shared/firebase";
import { appendAuditLog, computeChangedFields } from "../shared/auditLog";
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
    cnpj: data.cnpj ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
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
  const docRef = doc(firestore, COLLECTION, slug);
  const before = await getDoc(docRef);
  const beforeData = before.data();

  const batch = writeBatch(firestore);
  batch.update(docRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });

  if (beforeData && auth.currentUser) {
    const changedFields = computeChangedFields(beforeData, input);
    if (changedFields.length > 0) {
      appendAuditLog(batch, {
        companyId: slug,
        entityType: "companies",
        entityId: slug,
        entitySummary: beforeData.name ?? slug,
        action: "update",
        changedFields,
        owner: { uid: auth.currentUser.uid, name: auth.currentUser.displayName ?? auth.currentUser.email },
      });
    }
  }

  await batch.commit();
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
