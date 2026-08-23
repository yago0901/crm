import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { ILedgerEntry, LedgerEntryInput, LedgerEntryType } from "../../types/ledgerEntry";

export const mapLedgerEntry = (
  snap: QueryDocumentSnapshot<DocumentData>
): ILedgerEntry => {
  const data = snap.data();
  return {
    id: snap.id,
    description: data.description,
    category: data.category ?? "",
    type: data.type,
    value: data.value ?? 0,
    date: data.date ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const ledgerService = createCrudService<ILedgerEntry, LedgerEntryInput>(
  "ledgerEntries",
  mapLedgerEntry,
  { orderByField: "date", orderDirection: "desc", filterField: "type" }
);

export function subscribeToLedgerEntries(
  type: LedgerEntryType | "all",
  onChange: (entries: ILedgerEntry[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return ledgerService.subscribe(type, onChange, onError);
}

export async function createLedgerEntry(
  input: LedgerEntryInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return ledgerService.create(input, owner);
}

export async function updateLedgerEntry(
  entryId: string,
  input: Partial<LedgerEntryInput>
): Promise<void> {
  return ledgerService.update(entryId, input);
}

export async function deleteLedgerEntry(entryId: string): Promise<void> {
  return ledgerService.remove(entryId);
}

export async function getLedgerBalance(): Promise<number> {
  const [credito, debito] = await Promise.all([
    ledgerService.sumByStatus("value", "credito"),
    ledgerService.sumByStatus("value", "debito"),
  ]);
  return credito - debito;
}
