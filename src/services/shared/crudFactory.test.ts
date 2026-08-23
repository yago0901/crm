import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
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
  deleteDoc,
  getAggregateFromServer,
  onSnapshot,
  updateDoc,
  where,
} from "firebase/firestore";
import { createCrudService } from "./crudFactory";

interface FakeItem {
  id: string;
  name: string;
  status: string;
}

const mapFakeItem = () => ({}) as FakeItem;

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

  it("update() merges input and extra fields, always bumping updatedAt", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    await service.update("item1", { name: "Novo nome" }, { status: "arquivado" });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "Novo nome",
        status: "arquivado",
        updatedAt: "SERVER_TIMESTAMP",
      })
    );
  });

  it("remove() deletes the document by id", async () => {
    const service = createCrudService<FakeItem, { name: string }>("fakes", mapFakeItem);

    await service.remove("item1");

    expect(deleteDoc).toHaveBeenCalledOnce();
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
