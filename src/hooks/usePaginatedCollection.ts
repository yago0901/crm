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
} from "firebase/firestore";
import { useRef, useState } from "react";
import { firestore } from "../services/shared/firebase";

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

  const pageQuery = useQuery({
    queryKey: [collectionPath, "page", resetKey, currentPage, pageSize],
    queryFn: async () => {
      const ref = collection(firestore, collectionPath);

      for (let p = 1; p < currentPage; p++) {
        const key = cursorCacheKey(p);
        if (cursorsRef.current.has(key)) continue;

        const prevCursor =
          p === 1 ? undefined : cursorsRef.current.get(cursorCacheKey(p - 1)) ?? undefined;
        const q = prevCursor
          ? query(ref, ...constraints, startAfter(prevCursor), limit(pageSize))
          : query(ref, ...constraints, limit(pageSize));

        const snap = await getDocs(q);
        cursorsRef.current.set(key, snap.docs[snap.docs.length - 1] ?? null);
      }

      const cursor =
        currentPage === 1
          ? undefined
          : cursorsRef.current.get(cursorCacheKey(currentPage - 1)) ?? undefined;
      const q = cursor
        ? query(ref, ...constraints, startAfter(cursor), limit(pageSize))
        : query(ref, ...constraints, limit(pageSize));

      const snap = await getDocs(q);
      cursorsRef.current.set(cursorCacheKey(currentPage), snap.docs[snap.docs.length - 1] ?? null);

      return snap.docs.map(mapDoc);
    },
    placeholderData: keepPreviousData,
  });

  const countQuery = useQuery({
    queryKey: [collectionPath, "count", resetKey],
    queryFn: async () => {
      const ref = collection(firestore, collectionPath);
      const snap = await getAggregateFromServer(query(ref, ...constraints), {
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
