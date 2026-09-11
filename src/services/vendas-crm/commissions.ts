import {
  doc,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { firestore } from "../shared/firebase";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import { CommissionInput, CommissionStatus, ICommission } from "../../types/commission";

export const mapCommission = (snap: QueryDocumentSnapshot<DocumentData>): ICommission => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? "",
    salesOrderId: data.salesOrderId ?? "",
    salesOrderReference: data.salesOrderReference ?? "",
    saleValue: data.saleValue ?? 0,
    commissionRate: data.commissionRate ?? 0,
    commissionValue: data.commissionValue ?? 0,
    status: data.status,
    paidAt: data.paidAt ?? null,
    notes: data.notes ?? "",
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const commissionsService = createCrudService<ICommission, CommissionInput>(
  "commissions",
  mapCommission
);

export function subscribeToCommissions(
  status: CommissionStatus | "all",
  onChange: (commissions: ICommission[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return commissionsService.subscribe(status, onChange, onError, getCurrentCompanyId() ?? undefined);
}

export async function createCommission(
  input: CommissionInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return commissionsService.create(input, owner, {
    paidAt: null,
  });
}

export async function updateCommission(
  commissionId: string,
  input: Partial<CommissionInput>
): Promise<void> {
  return commissionsService.update(commissionId, input);
}

export async function markCommissionPaid(commissionId: string): Promise<void> {
  await updateDoc(doc(firestore, "commissions", commissionId), {
    status: "pago",
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCommission(commissionId: string): Promise<void> {
  return commissionsService.remove(commissionId);
}

export async function getPendingCommissionsTotal(): Promise<number> {
  return commissionsService.sumByStatus(
    "commissionValue",
    "pendente",
    getCurrentCompanyId() ?? undefined
  );
}
