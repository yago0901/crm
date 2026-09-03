import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  sum: vi.fn((field) => ({ type: "sum", field })),
  count: vi.fn(() => ({ type: "count" })),
  onSnapshot: vi.fn(),
}));

import {
  addDoc,
  getAggregateFromServer,
  getDoc,
  onSnapshot,
  where,
  writeBatch,
} from "firebase/firestore";
import { createCrudService } from "./crudFactory";

interface FakeItem {
  id: string;
  name: string;
  status: string;
}

const mapFakeItem = () => ({}) as FakeItem;

const mockBatch = () => {
  const batchSet = vi.fn();
  const batchUpdate = vi.fn();
  const batchDelete = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);
  vi.mocked(writeBatch).mockReturnValue({
    set: batchSet,
    update: batchUpdate,
    delete: batchDelete,
    commit: batchCommit,
  } as never);
  return { batchSet, batchUpdate, batchDelete, batchCommit };
};

describe("createCrudService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create() merges owner info, timestamps, and extra fields over the input", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(addDoc).mockResolvedValue({ id: "new-id" } as never);

    const id = await service.create(
      { name: "Item" },
      { uid: "owner1", name: "Yago" },
      { extraField: true }
    );

    expect(id).toBe("new-id");
    expect(addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Item",
        extraField: true,
        ownerId: "owner1",
        ownerName: "Yago",
        createdAt: "SERVER_TIMESTAMP",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });

  it("update() writes input and extra fields in a batch, always bumping updatedAt", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ companyId: "acme", name: "Antigo" }),
    } as never);
    const { batchUpdate, batchCommit } = mockBatch();

    await service.update("item1", { name: "Novo nome" }, { status: "arquivado" });

    expect(batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Novo nome",
        status: "arquivado",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
    expect(batchCommit).toHaveBeenCalledOnce();
  });

  it("update() appends an audit log entry describing what changed", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ companyId: "acme", name: "Antigo" }),
    } as never);
    const { batchSet } = mockBatch();

    await service.update("item1", { name: "Novo nome" });

    expect(batchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "acme",
        entityType: "fakes",
        entityId: "item1",
        action: "update",
        changedFields: [{ field: "name", before: "Antigo", after: "Novo nome" }],
        ownerId: "owner1",
        ownerName: "Yago",
      })
    );
  });

  it("update() skips the audit log when nothing actually changed", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ companyId: "acme", name: "Mesmo nome" }),
    } as never);
    const { batchSet } = mockBatch();

    await service.update("item1", { name: "Mesmo nome" });

    expect(batchSet).not.toHaveBeenCalled();
  });

  it("remove() deletes the document in a batch and logs a delete entry", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ companyId: "acme", name: "Item" }),
    } as never);
    const { batchDelete, batchSet, batchCommit } = mockBatch();

    await service.remove("item1");

    expect(batchDelete).toHaveBeenCalledOnce();
    expect(batchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "acme",
        entityType: "fakes",
        entityId: "item1",
        entitySummary: "Item",
        action: "delete",
        ownerId: "owner1",
      })
    );
    expect(batchCommit).toHaveBeenCalledOnce();
  });

  it("subscribe('all') queries without a status filter", () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    service.subscribe("all", vi.fn());

    expect(where).not.toHaveBeenCalled();
    expect(onSnapshot).toHaveBeenCalledOnce();
  });

  it("subscribe(status) filters by the status field", () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    service.subscribe("ativo", vi.fn());

    expect(where).toHaveBeenCalledWith("status", "==", "ativo");
  });

  it("sumByStatus() aggregates the given field for the given status", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 42 }),
    } as never);

    const total = await service.sumByStatus("value", "pendente");

    expect(total).toBe(42);
    expect(where).toHaveBeenCalledWith("status", "==", "pendente");
  });

  it("countByStatus() aggregates a document count for the given status", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 5 }),
    } as never);

    const total = await service.countByStatus("triagem");

    expect(total).toBe(5);
    expect(where).toHaveBeenCalledWith("status", "==", "triagem");
  });

  it("subscribe(filter, onChange, onError, companyId) adds a companyId filter alongside the status filter", () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    service.subscribe("ativo", vi.fn(), undefined, "acme");

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(where).toHaveBeenCalledWith("status", "==", "ativo");
  });

  it("subscribe('all', onChange, onError, companyId) filters by companyId only", () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    service.subscribe("all", vi.fn(), undefined, "acme");

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(where).not.toHaveBeenCalledWith("status", "==", expect.anything());
  });

  it("omitting companyId keeps subscribe/sumByStatus/countByStatus unfiltered by company, for modules not migrated yet", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 1 }),
    } as never);

    service.subscribe("ativo", vi.fn());
    await service.sumByStatus("value", "ativo");
    await service.countByStatus("ativo");

    expect(where).not.toHaveBeenCalledWith("companyId", "==", expect.anything());
  });

  it("sumByStatus/countByStatus add a companyId filter when given one", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 7 }),
    } as never);

    await service.sumByStatus("value", "pendente", "acme");
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");

    await service.countByStatus("pendente", "acme");
    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
  });

  it("uses a custom filterField for subscribe/sumByStatus/countByStatus when configured", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem, {
      filterField: "type",
    });
    vi.mocked(getAggregateFromServer).mockResolvedValue({
      data: () => ({ total: 10 }),
    } as never);

    service.subscribe("credito", vi.fn());
    expect(where).toHaveBeenCalledWith("type", "==", "credito");

    await service.sumByStatus("value", "debito");
    expect(where).toHaveBeenCalledWith("type", "==", "debito");
  });
});
