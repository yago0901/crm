import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("../contexts/auth/AuthContext", () => ({
  useAuth: () => ({
    currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" },
  }),
}));

const showToast = vi.fn();
vi.mock("../components/common/Toast/ToastContext", () => ({
  useToast: () => ({ showToast }),
}));

let fakeDocs: { id: string; data: () => Record<string, unknown> }[] = [];

vi.mock("../services/shared/firebase", () => ({ firestore: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  limit: vi.fn((n) => ({ type: "limit", n })),
  startAfter: vi.fn((cursor) => ({ type: "startAfter", cursor })),
  count: vi.fn(() => ({ type: "count" })),
  getDocs: vi.fn(async () => ({ docs: fakeDocs })),
  getAggregateFromServer: vi.fn(async () => ({ data: () => ({ total: fakeDocs.length }) })),
}));

import { useResourceCrud } from "./useResourceCrud";
import { ResourceSchema } from "../components/common/ResourcePage/types";

interface FakeItem {
  id: string;
  name: string;
  status: string;
}
interface FakeInput {
  name: string;
  status: string;
}

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60000 } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// Uses a real QueryClient + a lightly-mocked usePaginatedCollection stack
// (only firebase/firestore is mocked) instead of stubbing the hook away, so
// this exercises the real cache-invalidation path — the exact behavior a
// user reported as broken (list not refreshing after create/edit, only
// after delete) during live testing of the ResourcePage pilot.
describe("useResourceCrud + usePaginatedCollection: list refreshes after every write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeDocs = [{ id: "i1", data: () => ({ name: "Original", status: "ativo" }) }];
  });

  const schema: ResourceSchema<FakeItem, FakeInput> = {
    pageTitle: "Fakes",
    newLabel: "Novo fake",
    entityLabel: "fake",
    loadingMessage: "Carregando...",
    emptyMessage: "Nada.",
    messages: { created: "Criado.", updated: "Atualizado.", deleted: "Excluído." },
    collectionPath: "fakes",
    mapDoc: (snap) => ({ id: snap.id, ...snap.data() }) as FakeItem,
    filterOptions: [{ value: "ativo", label: "Ativo" }],
    columns: [{ key: "name", label: "Nome", render: (item) => item.name }],
    fields: [{ key: "name", label: "Nome", kind: "text" }],
    emptyForm: { name: "", status: "ativo" },
    toInput: (item) => ({ name: item.name, status: item.status }),
    getRowLabel: (item) => item.name,
    create: vi.fn(async () => {
      fakeDocs = [...fakeDocs, { id: "i2", data: () => ({ name: "Novo item", status: "ativo" }) }];
      return "i2";
    }),
    update: vi.fn(async () => {
      fakeDocs = fakeDocs.map((d) =>
        d.id === "i1" ? { id: "i1", data: () => ({ name: "Editado", status: "ativo" }) } : d
      );
    }),
    remove: vi.fn(async () => {
      fakeDocs = fakeDocs.filter((d) => d.id !== "i1");
    }),
  };

  it("shows the new item after create, without needing a manual refetch", async () => {
    const { result } = renderHook(() => useResourceCrud(schema), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.openCreateForm());
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((i) => i.name)).toContain("Novo item");
  });

  it("shows the edited fields after update, without needing a manual refetch", async () => {
    const { result } = renderHook(() => useResourceCrud(schema), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.openEditForm(result.current.items[0]));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() => expect(result.current.items[0].name).toBe("Editado"));
  });

  it("shows the list without the item after delete (control case, known to work)", async () => {
    const { result } = renderHook(() => useResourceCrud(schema), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.setItemToDelete(result.current.items[0]));
    await act(async () => {
      await result.current.handleDelete();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });
});
