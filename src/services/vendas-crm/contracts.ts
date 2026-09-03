import {
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { appendAuditLog } from "../shared/auditLog";
import { ContractInput, ContractStatus, IContract } from "../../types/contract";

export const mapContract = (
  snap: QueryDocumentSnapshot<DocumentData>
): IContract => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    title: data.title,
    contactId: data.contactId,
    contactName: data.contactName,
    value: data.value ?? 0,
    status: data.status,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    notes: data.notes ?? "",
    dealId: data.dealId ?? "",
    dealTitle: data.dealTitle ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const contractsService = createCrudService<IContract, ContractInput>(
  "contracts",
  mapContract
);

export function subscribeToContracts(
  status: ContractStatus | "all",
  onChange: (contracts: IContract[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return contractsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createContract(
  input: ContractInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return contractsService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateContract(
  contractId: string,
  input: Partial<ContractInput>
): Promise<void> {
  return contractsService.update(contractId, input);
}

export async function deleteContract(contractId: string): Promise<void> {
  return contractsService.remove(contractId);
}

export async function getActiveContractsTotal(): Promise<number> {
  return contractsService.sumByStatus("value", "ativo", getCurrentCompanyId() ?? undefined);
}

export async function createContractFromDeal(
  input: ContractInput,
  dealId: string,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    throw new Error("Nenhuma empresa selecionada.");
  }

  const dealRef = doc(firestore, "deals", dealId);
  const contractRef = doc(collection(firestore, "contracts"));
  const receivableRef = doc(collection(firestore, "receivables"));

  await runTransaction(firestore, async (transaction) => {
    const dealSnap = await transaction.get(dealRef);
    if (!dealSnap.exists()) {
      throw new Error("Negócio não encontrado.");
    }
    const deal = dealSnap.data();

    if (deal.status !== "ganho") {
      throw new Error("Só é possível gerar contrato de um negócio marcado como Ganho.");
    }
    if (deal.convertedToContractId) {
      throw new Error("Esse negócio já foi convertido em contrato.");
    }

    transaction.set(contractRef, {
      ...input,
      companyId,
      dealId,
      dealTitle: deal.title ?? "",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(dealRef, {
      convertedToContractId: contractRef.id,
      updatedAt: serverTimestamp(),
    });

    transaction.set(receivableRef, {
      companyId,
      description: `Contrato: ${input.title}`,
      contactId: input.contactId,
      contactName: input.contactName,
      category: "Contratos",
      value: input.value,
      dueDate: input.startDate ?? input.endDate ?? null,
      receivedAt: null,
      status: "pendente",
      notes: "Gerado automaticamente a partir de um negócio ganho.",
      ownerId: owner.uid,
      ownerName: owner.name ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    appendAuditLog(transaction, {
      companyId,
      entityType: "deals",
      entityId: dealId,
      entitySummary: deal.title ?? dealId,
      action: "update",
      changedFields: [{ field: "convertedToContractId", before: null, after: contractRef.id }],
      owner,
    });
  });

  return contractRef.id;
}
