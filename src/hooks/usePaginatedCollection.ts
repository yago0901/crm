import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  collection,
  count,
  getAggregateFromServer,
  getDocs,
  limit,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { useRef, useState } from "react";
import { firestore } from "../services/shared/firebase";
import { getCurrentCompanyId } from "../services/shared/tenant";

interface UsePaginatedCollectionParams<T> {
  collectionPath: string;
  constraints: QueryConstraint[];
  mapDoc: (snap: QueryDocumentSnapshot<DocumentData>) => T;
  pageSize: number;
  resetKey: string;
}

export function usePaginatedCollection<T>({
  collectionPath,
  constraints,
  mapDoc,
  pageSize,
  resetKey,
}: UsePaginatedCollectionParams<T>) {
  const [currentPage, setCurrentPageState] = useState(1);
  const cursorsRef = useRef<Map<string, QueryDocumentSnapshot<DocumentData> | null>>(
    new Map()
  );
  const queryClient = useQueryClient();

  const resetKeyRef = useRef(resetKey);
  if (resetKeyRef.current !== resetKey) {
    resetKeyRef.current = resetKey;
    cursorsRef.current = new Map();
    if (currentPage !== 1) setCurrentPageState(1);
  }

  const cursorCacheKey = (page: number) => `${resetKey}:${page}`;

  // Every collection this hook reads from is scoped to a company by rule
  // (`belongsToCompany`), and that rule needs an equality filter on
  // `companyId` to even evaluate for a list/count query -- without it
  // Firestore rejects the whole query with permission-denied rather than
  // silently filtering. Callers pass their own status/order constraints;
  // this prepends the company filter so none of them have to remember to.
  const companyId = getCurrentCompanyId();
  const scopedConstraints = companyId ? [where("companyId", "==", companyId), ...constraints] : constraints;

  const pageQuery = useQuery({
    queryKey: [collectionPath, "page", resetKey, currentPage, pageSize, companyId],
    queryFn: async () => {
      const ref = collection(firestore, collectionPath);

      for (let p = 1; p < currentPage; p++) {
        const key = cursorCacheKey(p);
        if (cursorsRef.current.has(key)) continue;

        const prevCursor =
          p === 1 ? undefined : cursorsRef.current.get(cursorCacheKey(p - 1)) ?? undefined;
        const q = prevCursor
          ? query(ref, ...scopedConstraints, startAfter(prevCursor), limit(pageSize))
          : query(ref, ...scopedConstraints, limit(pageSize));

        const snap = await getDocs(q);
        cursorsRef.current.set(key, snap.docs[snap.docs.length - 1] ?? null);
      }

      const cursor =
        currentPage === 1
          ? undefined
          : cursorsRef.current.get(cursorCacheKey(currentPage - 1)) ?? undefined;
      const q = cursor
        ? query(ref, ...scopedConstraints, startAfter(cursor), limit(pageSize))
        : query(ref, ...scopedConstraints, limit(pageSize));

      const snap = await getDocs(q);
      cursorsRef.current.set(cursorCacheKey(currentPage), snap.docs[snap.docs.length - 1] ?? null);

      return snap.docs.map(mapDoc);
    },
    placeholderData: keepPreviousData,
  });

  const countQuery = useQuery({
    queryKey: [collectionPath, "count", resetKey, companyId],
    queryFn: async () => {
      const ref = collection(firestore, collectionPath);
      const snap = await getAggregateFromServer(query(ref, ...scopedConstraints), {
        total: count(),
      });
      return snap.data().total;
    },
  });

  const totalPages = Math.max(1, Math.ceil((countQuery.data ?? 0) / pageSize));

  const refresh = () => {
    cursorsRef.current = new Map();
    queryClient.invalidateQueries({ queryKey: [collectionPath] });
  };

  return {
    items: pageQuery.data ?? [],
    currentPage,
    totalPages,
    setCurrentPage: setCurrentPageState,
    loading: pageQuery.isLoading || countQuery.isLoading,
    error: pageQuery.error?.message ?? countQuery.error?.message ?? null,
    refresh,
  };
}
