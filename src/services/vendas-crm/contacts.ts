import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import {
  ContactInput,
  ContactStatus,
  IContact,
  IInteraction,
  InteractionInput,
} from "../../types/contact";

export const mapContact = (snap: QueryDocumentSnapshot<DocumentData>): IContact => {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    email: data.email,
    phone: data.phone ?? "",
    company: data.company ?? "",
    role: data.role ?? "",
    status: data.status,
    tags: data.tags ?? [],
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastInteractionAt: data.lastInteractionAt ?? null,
    nextContactAt: data.nextContactAt ?? null,
  };
};

const contactsService = createCrudService<IContact, ContactInput>(
  "contacts",
  mapContact
);
const contactsRef = contactsService.ref;

export function subscribeToContacts(
  status: ContactStatus | "all",
  onChange: (contacts: IContact[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return contactsService.subscribe(status, onChange, onError);
}

export async function createContact(
  input: ContactInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return contactsService.create(input, owner, {
    tags: input.tags ?? [],
    lastInteractionAt: null,
    nextContactAt: null,
  });
}

export async function updateContact(
  contactId: string,
  input: Partial<ContactInput>
): Promise<void> {
  return contactsService.update(contactId, input);
}

export async function updateContactStatus(
  contactId: string,
  status: ContactStatus
): Promise<void> {
  return contactsService.update(contactId, {}, { status });
}

export async function updateNextContact(
  contactId: string,
  date: Timestamp | null
): Promise<void> {
  return contactsService.update(contactId, {}, { nextContactAt: date });
}

export async function deleteContact(contactId: string): Promise<void> {
  const interactionsSnap = await getDocs(
    collection(firestore, "contacts", contactId, "interactions")
  );

  const batch = writeBatch(firestore);
  interactionsSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(firestore, "contacts", contactId));

  await batch.commit();
}

const mapInteraction = (
  snap: QueryDocumentSnapshot<DocumentData>
): IInteraction => {
  const data = snap.data();
  return {
    id: snap.id,
    contactId: snap.ref.parent.parent?.id ?? "",
    contactName: data.contactName ?? "",
    type: data.type,
    description: data.description,
    createdAt: data.createdAt ?? null,
    createdBy: data.createdBy,
    createdByName: data.createdByName ?? "",
  };
};

export function subscribeToInteractions(
  contactId: string,
  onChange: (interactions: IInteraction[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(firestore, "contacts", contactId, "interactions"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapInteraction)),
    (error) => onError?.(error)
  );
}

export async function searchContacts(
  status: ContactStatus | "all",
  term: string
): Promise<IContact[]> {
  const constraints =
    status === "all"
      ? [orderBy("createdAt", "desc")]
      : [where("status", "==", status), orderBy("createdAt", "desc")];

  const snapshot = await getDocs(query(contactsRef, ...constraints));
  const lower = term.trim().toLowerCase();

  return snapshot.docs
    .map(mapContact)
    .filter((c) => [c.name, c.email, c.company].some((field) => field?.toLowerCase().includes(lower)));
}

export async function fetchClientContacts(): Promise<IContact[]> {
  const q = query(
    contactsRef,
    where("status", "==", "cliente"),
    orderBy("name", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapContact);
}

export async function addInteraction(
  contactId: string,
  contactName: string,
  input: InteractionInput,
  author: { uid: string; name?: string | null }
): Promise<void> {
  await addDoc(
    collection(firestore, "contacts", contactId, "interactions"),
    {
      ...input,
      contactName,
      createdAt: serverTimestamp(),
      createdBy: author.uid,
      createdByName: author.name ?? "",
    }
  );

  await updateDoc(doc(firestore, "contacts", contactId), {
    lastInteractionAt: serverTimestamp(),
  });
}
