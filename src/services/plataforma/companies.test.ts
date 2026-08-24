import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

import { getDoc, setDoc, updateDoc } from "firebase/firestore";
import { createCompany, getCompany, updateCompany } from "./companies";

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

describe("updateCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the company doc", async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined as never);

    await updateCompany("acme", { maxUsers: 10 });

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxUsers: 10 })
    );
  });
});
