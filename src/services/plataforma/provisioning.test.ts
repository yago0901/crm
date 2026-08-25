import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, ...path) => ({ type: "doc", path })),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
}));

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock("../shared/firebase", () => ({
  auth: {},
}));

vi.mock("./companies", () => ({
  getCompany: vi.fn(),
}));

vi.mock("./secondaryApp", () => ({
  withNewAuthAccount: vi.fn(
    async (_email: string, _password: string, action: (ctx: { uid: string; db: unknown }) => unknown) =>
      action({ uid: "new-uid", db: {} })
  ),
}));

vi.mock("./passwordGenerator", () => ({
  generateTempPassword: vi.fn(() => "TempPass123"),
}));

import { setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getCompany } from "./companies";
import {
  findAvailableSlug,
  provisionCompanyWithPrimaryAccount,
  slugify,
} from "./provisioning";

describe("slugify", () => {
  it("removes accents, lowercases, and strips non-alphanumeric characters", () => {
    expect(slugify("Padaria do João Ltda")).toBe("padariadojoaoltda");
    expect(slugify("Acme Ltda.")).toBe("acmeltda");
  });

  it("falls back to an empty string when nothing alphanumeric survives", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("findAvailableSlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the base slug when it is not taken", async () => {
    vi.mocked(getCompany).mockResolvedValue(null);

    expect(await findAvailableSlug("Acme Ltda")).toBe("acmeltda");
  });

  it("appends a numeric suffix when the base slug is already taken", async () => {
    vi.mocked(getCompany)
      .mockResolvedValueOnce({ id: "acmeltda" } as never)
      .mockResolvedValueOnce({ id: "acmeltda2" } as never)
      .mockResolvedValueOnce(null);

    expect(await findAvailableSlug("Acme Ltda")).toBe("acmeltda3");
  });

  it("falls back to 'empresa' when the name has no alphanumeric characters", async () => {
    vi.mocked(getCompany).mockResolvedValue(null);

    expect(await findAvailableSlug("!!!")).toBe("empresa");
  });
});

describe("provisionCompanyWithPrimaryAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCompany).mockResolvedValue(null);
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({} as never);
  });

  it("creates the company, the primary admin profile, and the login mapping", async () => {
    const result = await provisionCompanyWithPrimaryAccount({
      companyName: "Acme Ltda",
      username: "joao",
      email: "joao@example.com",
    });

    expect(result).toEqual({
      companyId: "acmeltda",
      slug: "acmeltda",
      username: "joao",
      login: "acmeltda.joao",
      tempPassword: "TempPass123",
      autoSignedIn: true,
    });

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: ["companies", "acmeltda"] }),
      expect.objectContaining({
        slug: "acmeltda",
        name: "Acme Ltda",
        plan: "trial",
        maxUsers: 5,
        userCount: 1,
        primaryUserId: "new-uid",
      })
    );

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: ["users", "new-uid"] }),
      expect.objectContaining({
        companyId: "acmeltda",
        email: "joao@example.com",
        level: "Admin",
        mustChangePassword: true,
      })
    );

    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: ["logins", "acmeltda.joao"] }),
      expect.objectContaining({ email: "joao@example.com" })
    );

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "joao@example.com",
      "TempPass123"
    );
  });

  it("reports autoSignedIn: false without failing the whole provisioning when the auto sign-in fails", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error("network error"));

    const result = await provisionCompanyWithPrimaryAccount({
      companyName: "Acme Ltda",
      username: "joao",
      email: "joao@example.com",
    });

    expect(result.autoSignedIn).toBe(false);
    expect(result.login).toBe("acmeltda.joao");
    expect(result.tempPassword).toBe("TempPass123");
  });

  it("grants every module to the primary admin account", async () => {
    await provisionCompanyWithPrimaryAccount({
      companyName: "Acme Ltda",
      username: "joao",
      email: "joao@example.com",
    });

    const userCall = vi
      .mocked(setDoc)
      .mock.calls.find(([ref]) => (ref as unknown as { path: string[] }).path[0] === "users");
    expect(userCall?.[1]).toMatchObject({
      modules: [
        "sales",
        "financial",
        "human-resources",
        "inventory-logistics",
        "production",
        "projects",
        "business-intelligence",
        "compliance",
        "collaboration",
      ],
    });
  });
});
