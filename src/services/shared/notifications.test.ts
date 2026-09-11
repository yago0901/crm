import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ firestore: {} }));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
}));

import { onSnapshot, where } from "firebase/firestore";
import { mapNotification, subscribeToNotifications } from "./notifications";
import { setCurrentCompanyId } from "./tenant";

describe("mapNotification", () => {
  it("defaults optional fields", () => {
    const notification = mapNotification({
      id: "n1",
      data: () => ({ companyId: "acme", type: "estoque_baixo", status: "aberto" }),
    } as never);

    expect(notification).toMatchObject({
      id: "n1",
      type: "estoque_baixo",
      status: "aberto",
      title: "",
      message: "",
      relatedModule: "",
      triggerValue: 0,
      thresholdValue: 0,
      resolvedAt: null,
    });
  });
});

describe("subscribeToNotifications", () => {
  it("returns a no-op and emits an empty list when there is no company", () => {
    setCurrentCompanyId(null);
    const onChange = vi.fn();

    const unsub = subscribeToNotifications("aberto", onChange);

    expect(onChange).toHaveBeenCalledWith([]);
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(typeof unsub).toBe("function");
  });

  it("adds a status filter when a concrete status is given", () => {
    setCurrentCompanyId("acme");
    vi.mocked(onSnapshot).mockReturnValue(vi.fn() as never);

    subscribeToNotifications("aberto", vi.fn());

    expect(where).toHaveBeenCalledWith("companyId", "==", "acme");
    expect(where).toHaveBeenCalledWith("status", "==", "aberto");
  });
});
