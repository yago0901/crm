import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { IProposal, ProposalInput, ProposalStatus } from "../../types/proposal";

export const mapProposal = (snap: QueryDocumentSnapshot<DocumentData>): IProposal => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    contactId: data.contactId,
    contactName: data.contactName ?? "",
    dealId: data.dealId ?? "",
    dealTitle: data.dealTitle ?? "",
    items: data.items ?? [],
    total: data.total ?? 0,
    validUntil: data.validUntil ?? null,
    status: data.status,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const proposalsService = createCrudService<IProposal, ProposalInput>("proposals", mapProposal);

export function subscribeToProposals(
  status: ProposalStatus | "all",
  onChange: (proposals: IProposal[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return proposalsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createProposal(
  input: ProposalInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return proposalsService.create(input, owner, { companyId: getCurrentCompanyId() });
}

export async function updateProposal(
  proposalId: string,
  input: Partial<ProposalInput>
): Promise<void> {
  return proposalsService.update(proposalId, input);
}

export async function deleteProposal(proposalId: string): Promise<void> {
  return proposalsService.remove(proposalId);
}
