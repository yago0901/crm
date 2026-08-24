import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
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
