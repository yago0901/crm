import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

import { getDoc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { createCompany, getCompany, subscribeToCompanies, updateCompany } from "./companies";

describe("createCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the company doc using the slug as its id", async () => {
    vi.mocked(setDoc).mockResolvedValue(undefined as never);

    const id = await createCompany({
      slug: "padariadojoao",
      name: "Padaria do João Ltda",
      plan: "trial",
      trialEndsAt: null,
      maxUsers: 5,
      primaryUserId: "uid1",
      primaryEmail: "joao@example.com",
    });

    expect(id).toBe("padariadojoao");
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        slug: "padariadojoao",
        primaryUserId: "uid1",
        userCount: 1,
      })
    );
  });
});

describe("getCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the company does not exist", async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as never);

    expect(await getCompany("naoexiste")).toBeNull();
  });

  it("maps the company data when it exists", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      id: "acme",
      exists: () => true,
      data: () => ({
        slug: "acme",
        name: "Acme",
        plan: "trial",
        trialEndsAt: null,
        maxUsers: 5,
        userCount: 1,
        primaryUserId: "uid1",
        createdAt: null,
        updatedAt: null,
      }),
    } as never);

    const company = await getCompany("acme");
    expect(company?.name).toBe("Acme");
    expect(company?.id).toBe("acme");
  });
});

describe("subscribeToCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps every company in the snapshot", () => {
    const docs = [
      {
        id: "acme",
        data: () => ({
          slug: "acme",
          name: "Acme",
          plan: "trial",
          trialEndsAt: null,
          maxUsers: 5,
          userCount: 1,
          primaryUserId: "uid1",
          primaryEmail: "joao@example.com",
          createdAt: null,
          updatedAt: null,
        }),
      },
    ];
    vi.mocked(onSnapshot).mockImplementation((_q, onNext) => {
      (onNext as (snap: unknown) => void)({ docs });
      return vi.fn();
    });

    const onChange = vi.fn();
    subscribeToCompanies(onChange);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: "acme", name: "Acme", primaryEmail: "joao@example.com" }),
    ]);
  });
});

describe("updateCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the company doc in a batch", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ name: "Acme", maxUsers: 5 }),
    } as never);
    const batchUpdate = vi.fn();
    const batchSet = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({
      update: batchUpdate,
      set: batchSet,
      commit: batchCommit,
    } as never);

    await updateCompany("acme", { maxUsers: 10 });

    expect(batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxUsers: 10 })
    );
    expect(batchCommit).toHaveBeenCalledOnce();
  });

  it("logs an audit entry describing what changed", async () => {
    vi.mocked(getDoc).mockResolvedValue({
      data: () => ({ name: "Acme", maxUsers: 5 }),
    } as never);
    const batchSet = vi.fn();
    vi.mocked(writeBatch).mockReturnValue({
      update: vi.fn(),
      set: batchSet,
      commit: vi.fn().mockResolvedValue(undefined),
    } as never);

    await updateCompany("acme", { maxUsers: 10 });

    expect(batchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "acme",
        entityType: "companies",
        entityId: "acme",
        entitySummary: "Acme",
        action: "update",
        changedFields: [{ field: "maxUsers", before: 5, after: 10 }],
      })
    );
  });
});
