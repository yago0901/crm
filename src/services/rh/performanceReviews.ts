import { DocumentData, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { createCrudService } from "../shared/crudFactory";
import { getCurrentCompanyId } from "../shared/tenant";
import {
  IPerformanceReview,
  PerformanceReviewInput,
  PerformanceReviewStatus,
} from "../../types/performanceReview";

export const mapPerformanceReview = (
  snap: QueryDocumentSnapshot<DocumentData>
): IPerformanceReview => {
  const data = snap.data();
  return {
    id: snap.id,
    companyId: data.companyId,
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? "",
    period: data.period,
    score: data.score ?? 0,
    strengths: data.strengths ?? "",
    improvements: data.improvements ?? "",
    status: data.status,
    ownerId: data.ownerId,
    ownerName: data.ownerName ?? "",
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

const performanceReviewsService = createCrudService<
  IPerformanceReview,
  PerformanceReviewInput
>("performanceReviews", mapPerformanceReview);

export function subscribeToPerformanceReviews(
  status: PerformanceReviewStatus | "all",
  onChange: (reviews: IPerformanceReview[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return performanceReviewsService.subscribe(
    status,
    onChange,
    onError,
    getCurrentCompanyId() ?? undefined
  );
}

export async function createPerformanceReview(
  input: PerformanceReviewInput,
  owner: { uid: string; name?: string | null }
): Promise<string> {
  return performanceReviewsService.create(input, owner, {
    companyId: getCurrentCompanyId(),
  });
}

export async function updatePerformanceReview(
  reviewId: string,
  input: Partial<PerformanceReviewInput>
): Promise<void> {
  return performanceReviewsService.update(reviewId, input);
}

export async function deletePerformanceReview(reviewId: string): Promise<void> {
  return performanceReviewsService.remove(reviewId);
}
