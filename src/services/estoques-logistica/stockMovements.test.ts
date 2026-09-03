import { describe, expect, it, vi, beforeEach } from "vitest";

const { transactionGet, transactionUpdate, transactionSet, getDocsMock } = vi.hoisted(() => ({
  transactionGet: vi.fn(),
  transactionUpdate: vi.fn(),
  transactionSet: vi.fn(),
  getDocsMock: vi.fn(),
}));

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((refOrDb, ...path) => {
    if (path.length === 0 && refOrDb?.type === "collection") {
      return {
        type: "doc",
        path: refOrDb.path,
        id: refOrDb.path[0] === "inventoryItems" ? "item-1" : "movement-1",
      };
    }
    return { type: "doc", path, id: path[path.length - 1] };
  }),
  runTransaction: vi.fn(async (_db, callback) =>
    callback({ get: transactionGet, update: transactionUpdate, set: transactionSet })
  ),
  getDocs: getDocsMock,
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

import {
  computeMovementDelta,
  createStockMovement,
  fetchMovementsForItem,
} from "./stockMovements";
import { setCurrentCompanyId } from "../shared/tenant";

describe("computeMovementDelta", () => {
  it("entrada and devolucao always increase, regardless of sign given", () => {
    expect(computeMovementDelta("entrada", 10, 5)).toBe(10);
    expect(computeMovementDelta("devolucao", -10, 5)).toBe(10);
  });

  it("saida and perda always decrease, regardless of sign given", () => {
    expect(computeMovementDelta("saida", 10, 20)).toBe(-10);
    expect(computeMovementDelta("perda", -10, 20)).toBe(-10);
  });

  it("ajuste passes the signed value through as-is", () => {
    expect(computeMovementDelta("ajuste", 15, 100)).toBe(15);
    expect(computeMovementDelta("ajuste", -15, 100)).toBe(-15);
  });

  it("inventario computes the delta between the counted value and the current balance", () => {
    expect(computeMovementDelta("inventario", 80, 100)).toBe(-20);
    expect(computeMovementDelta("inventario", 120, 100)).toBe(20);
    expect(computeMovementDelta("inventario", 100, 100)).toBe(0);
  });
});

describe("createStockMovement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("throws when the item does not exist", async () => {
    transactionGet.mockResolvedValue({ exists: () => false });

    await expect(
      createStockMovement(
        { itemId: "item-1", type: "entrada", value: 10 },
        { uid: "owner1" }
      )
    ).rejects.toThrow("Item não encontrado.");
  });

  it("throws when the resulting quantity would go negative", async () => {
    transactionGet.mockResolvedValue({ exists: () => true, data: () => ({ quantity: 5 }) });

    await expect(
      createStockMovement(
        { itemId: "item-1", type: "saida", value: 10 },
        { uid: "owner1" }
      )
    ).rejects.toThrow("negativo");
  });

  it("updates the item balance and records the movement together", async () => {
    transactionGet.mockResolvedValue({ exists: () => true, data: () => ({ quantity: 5 }) });

    await createStockMovement(
      { itemId: "item-1", type: "entrada", value: 10, notes: "Compra" },
      { uid: "owner1", name: "Yago" }
    );

    expect(transactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "item-1" }),
      expect.objectContaining({ quantity: 15 })
    );
    expect(transactionSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "movement-1" }),
      expect.objectContaining({
        companyId: "acme",
        itemId: "item-1",
        type: "entrada",
        quantity: 10,
        balanceAfter: 15,
        notes: "Compra",
        ownerId: "owner1",
      })
    );
  });
});

describe("fetchMovementsForItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no current company", async () => {
    setCurrentCompanyId(null);
    expect(await fetchMovementsForItem("item-1")).toEqual([]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it("maps returned documents", async () => {
    setCurrentCompanyId("acme");
    getDocsMock.mockResolvedValue({
      docs: [
        {
          id: "m1",
          data: () => ({
            companyId: "acme",
            itemId: "item-1",
            type: "entrada",
            quantity: 10,
            balanceAfter: 10,
            ownerId: "owner1",
          }),
        },
      ],
    });

    const result = await fetchMovementsForItem("item-1");
    expect(result).toEqual([
      {
        id: "m1",
        companyId: "acme",
        itemId: "item-1",
        type: "entrada",
        quantity: 10,
        balanceAfter: 10,
        notes: "",
        ownerId: "owner1",
        ownerName: "",
        createdAt: null,
      },
    ]);
  });
});
