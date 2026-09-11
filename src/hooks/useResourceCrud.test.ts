import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { showToast, refresh, usePaginatedCollectionMock } = vi.hoisted(() => ({
  showToast: vi.fn(),
  refresh: vi.fn(),
  usePaginatedCollectionMock: vi.fn(),
}));

vi.mock("../contexts/auth/AuthContext", () => ({
  useAuth: () => ({
    currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" },
  }),
}));

vi.mock("../components/common/Toast/ToastContext", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("./usePaginatedCollection", () => ({
  usePaginatedCollection: usePaginatedCollectionMock,
}));

vi.mock("firebase/firestore", () => ({
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
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

const buildSchema = (overrides: Partial<ResourceSchema<FakeItem, FakeInput>> = {}) => {
  const schema: ResourceSchema<FakeItem, FakeInput> = {
    pageTitle: "Fakes",
    newLabel: "Novo fake",
    entityLabel: "fake",
    loadingMessage: "Carregando...",
    emptyMessage: "Nada.",
    messages: { created: "Criado.", updated: "Atualizado.", deleted: "Excluído." },
    collectionPath: "fakes",
    mapDoc: (snap) => ({ id: snap.id }) as FakeItem,
    filterOptions: [{ value: "ativo", label: "Ativo" }],
    columns: [{ key: "name", label: "Nome", render: (item) => item.name }],
    fields: [{ key: "name", label: "Nome", kind: "text" }],
    emptyForm: { name: "", status: "ativo" },
    toInput: (item) => ({ name: item.name, status: item.status }),
    getRowLabel: (item) => item.name,
    create: vi.fn().mockResolvedValue("new-id"),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return schema;
};

describe("useResourceCrud", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePaginatedCollectionMock.mockReturnValue({
      items: [{ id: "i1", name: "Item 1", status: "ativo" }],
      currentPage: 1,
      totalPages: 1,
      setCurrentPage: vi.fn(),
      loading: false,
      error: null,
      refresh,
    });
  });

  it("queries without a status filter when 'all' is selected", () => {
    renderHook(() => useResourceCrud(buildSchema()));

    const call = usePaginatedCollectionMock.mock.calls[0][0];
    expect(call.constraints).toHaveLength(1);
    expect(call.constraints[0]).toMatchObject({ type: "orderBy" });
  });

  it("adds a status where-constraint when a concrete filter is set", () => {
    const { result } = renderHook(() => useResourceCrud(buildSchema()));

    act(() => result.current.setStatusFilter("ativo"));

    const calls = usePaginatedCollectionMock.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.constraints).toHaveLength(2);
    expect(lastCall.constraints[0]).toMatchObject({ field: "status", value: "ativo" });
  });

  it("openEditForm loads the item through toInput, openCreateForm resets to emptyForm", () => {
    const schema = buildSchema();
    const { result } = renderHook(() => useResourceCrud(schema));

    act(() => result.current.openEditForm({ id: "i1", name: "Item 1", status: "ativo" }));
    expect(result.current.editingId).toBe("i1");
    expect(result.current.form).toEqual({ name: "Item 1", status: "ativo" });

    act(() => result.current.openCreateForm());
    expect(result.current.editingId).toBeNull();
    expect(result.current.form).toEqual(schema.emptyForm);
  });

  it("handleSubmit calls create() when there is no editingId, then refreshes and closes", async () => {
    const schema = buildSchema();
    const { result } = renderHook(() => useResourceCrud(schema));

    act(() => result.current.openCreateForm());
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(schema.create).toHaveBeenCalledWith(schema.emptyForm, { uid: "owner1", name: "Yago" });
    expect(showToast).toHaveBeenCalledWith("Criado.", "success");
    expect(refresh).toHaveBeenCalled();
    expect(result.current.isFormOpen).toBe(false);
  });

  it("handleSubmit calls update() when editing an existing item", async () => {
    const schema = buildSchema();
    const { result } = renderHook(() => useResourceCrud(schema));

    act(() => result.current.openEditForm({ id: "i1", name: "Item 1", status: "ativo" }));
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(schema.update).toHaveBeenCalledWith("i1", { name: "Item 1", status: "ativo" });
    expect(showToast).toHaveBeenCalledWith("Atualizado.", "success");
  });

  it("handleSubmit shows an error toast and keeps the form open when create() rejects", async () => {
    const schema = buildSchema({ create: vi.fn().mockRejectedValue(new Error("Falhou")) });
    const { result } = renderHook(() => useResourceCrud(schema));

    act(() => result.current.openCreateForm());
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as never);
    });

    expect(showToast).toHaveBeenCalledWith("Falhou", "error");
    expect(result.current.isFormOpen).toBe(true);
  });

  it("handleDelete removes the selected item, toasts, refreshes and clears the selection", async () => {
    const schema = buildSchema();
    const { result } = renderHook(() => useResourceCrud(schema));

    act(() => result.current.setItemToDelete({ id: "i1", name: "Item 1", status: "ativo" }));
    await act(async () => {
      await result.current.handleDelete();
    });

    expect(schema.remove).toHaveBeenCalledWith("i1");
    expect(showToast).toHaveBeenCalledWith("Excluído.", "success");
    expect(result.current.itemToDelete).toBeNull();
  });

  it("does nothing when handleDelete is called with no item selected", async () => {
    const schema = buildSchema();
    const { result } = renderHook(() => useResourceCrud(schema));

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(schema.remove).not.toHaveBeenCalled();
  });

  it("fetches the summary on mount only when the schema declares one", async () => {
    const fetchSummary = vi.fn().mockResolvedValue(7);
    const schema = buildSchema({ summary: { label: "Ativos", fetch: fetchSummary } });

    const { result } = renderHook(() => useResourceCrud(schema));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSummary).toHaveBeenCalledOnce();
    expect(result.current.summaryValue).toBe(7);
  });
});
