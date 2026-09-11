import { describe, expect, it, vi } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ type: "doc", path, id: path[path.length - 1] })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

import {
  applyLowStockNotification,
  decideLowStockAction,
  lowStockNotificationId,
} from "./lowStockNotifications";

describe("lowStockNotificationId", () => {
  it("builds a deterministic id per item", () => {
    expect(lowStockNotificationId("abc")).toBe("estoque_baixo__abc");
  });
});

describe("decideLowStockAction", () => {
  const base = { notifExists: false, notifStatus: null, quantity: 5, minQuantity: 10 };

  it("opens when below the minimum and there is no open notification", () => {
    expect(decideLowStockAction(base)).toBe("open");
  });

  it("updates when below the minimum and a notification is already open", () => {
    expect(
      decideLowStockAction({ ...base, notifExists: true, notifStatus: "aberto" })
    ).toBe("update");
  });

  it("reopens (open) when below the minimum and the existing notification is resolved", () => {
    expect(
      decideLowStockAction({ ...base, notifExists: true, notifStatus: "resolvido" })
    ).toBe("open");
  });

  it("resolves when back at or above the minimum and a notification is open", () => {
    expect(
      decideLowStockAction({ notifExists: true, notifStatus: "aberto", quantity: 12, minQuantity: 10 })
    ).toBe("resolve");
  });

  it("is a noop when at or above the minimum and nothing is open", () => {
    expect(
      decideLowStockAction({ notifExists: false, notifStatus: null, quantity: 12, minQuantity: 10 })
    ).toBe("noop");
  });

  it("treats minQuantity 0 as disabled — resolves an open one, otherwise noop", () => {
    expect(
      decideLowStockAction({ notifExists: true, notifStatus: "aberto", quantity: 1, minQuantity: 0 })
    ).toBe("resolve");
    expect(
      decideLowStockAction({ notifExists: false, notifStatus: null, quantity: 1, minQuantity: 0 })
    ).toBe("noop");
  });

  it("treats quantity exactly equal to the minimum as below (triggers)", () => {
    expect(
      decideLowStockAction({ notifExists: false, notifStatus: null, quantity: 10, minQuantity: 10 })
    ).toBe("open");
  });
});

describe("applyLowStockNotification", () => {
  const ref = { id: "estoque_baixo__item-1" } as never;
  const params = {
    companyId: "acme",
    itemId: "item-1",
    itemName: "Cerveja",
    quantity: 4,
    minQuantity: 10,
    owner: { uid: "owner1", name: "Yago" },
  };

  it("calls set with a full 'aberto' payload when opening", () => {
    const writer = { set: vi.fn(), update: vi.fn() };
    const snap = { exists: () => false } as never;

    const action = applyLowStockNotification(writer, ref, snap, params);

    expect(action).toBe("open");
    expect(writer.set).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({
        companyId: "acme",
        type: "estoque_baixo",
        status: "aberto",
        relatedId: "item-1",
        triggerValue: 4,
        thresholdValue: 10,
        ownerId: "owner1",
      })
    );
  });

  it("calls update with status resolvido when resolving", () => {
    const writer = { set: vi.fn(), update: vi.fn() };
    const snap = { exists: () => true, data: () => ({ status: "aberto" }) } as never;

    const action = applyLowStockNotification(writer, ref, snap, {
      ...params,
      quantity: 20,
    });

    expect(action).toBe("resolve");
    expect(writer.update).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ status: "resolvido" })
    );
  });

  it("does nothing on a noop", () => {
    const writer = { set: vi.fn(), update: vi.fn() };
    const snap = { exists: () => false } as never;

    const action = applyLowStockNotification(writer, ref, snap, { ...params, quantity: 50 });

    expect(action).toBe("noop");
    expect(writer.set).not.toHaveBeenCalled();
    expect(writer.update).not.toHaveBeenCalled();
  });
});
