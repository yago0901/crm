import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { firestore } from "../shared/firebase";
import { DealInput, DealStatus, IDeal } from "../../types/deal";

export const mapDeal = (snap: QueryDocumentSnapshot<DocumentData>): IDeal => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    contactId: data.contactId,
    contactName: data.contactName ?? "",
    title: data.title,
    estimatedValue: data.estimatedValue ?? 0,
    status: data.status,
    convertedToContractId: data.convertedToContractId ?? "",
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const dealsService = createCrudService<IDeal, DealInput>("deals", mapDeal);

export function subscribeToDeals(
  status: DealStatus | "all",
  onChange: (deals: IDeal[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return dealsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createDeal(
  input: DealInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return dealsService.create(input, owner, {
    companyId: getCurrentCompanyId(),
    convertedToContractId: null,
  });
}

export async function updateDeal(dealId: string, input: Partial<DealInput>): Promise<void> {
  return dealsService.update(dealId, input);
}

export async function deleteDeal(dealId: string): Promise<void> {
  return dealsService.remove(dealId);
}

export async function fetchWonUnconvertedDeals(): Promise<IDeal[]> {
  const companyId = getCurrentCompanyId();
  if (!companyId) return [];

  const q = query(
    collection(firestore, "deals"),
    where("companyId", "==", companyId),
    where("status", "==", "ganho"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapDeal).filter((deal) => !deal.convertedToContractId);
}
