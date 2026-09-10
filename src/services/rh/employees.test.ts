import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../shared/firebase", () => ({
  firestore: {},
  auth: { currentUser: { uid: "owner1", displayName: "Yago", email: "yago@test.com" } },
}));

vi.mock("./employeeAccess", () => ({
  setEmployeeAccess: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, ...path) => ({ type: "collection", path })),
  doc: vi.fn((refOrDb, ...path) => {
    if (path.length === 0 && refOrDb?.type === "collection") {
      const collectionName = refOrDb.path[0];
      return { type: "doc", path: refOrDb.path, id: `new-${collectionName}-id` };
    }
    return { type: "doc", path, id: path[path.length - 1] };
  }),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  getAggregateFromServer: vi.fn(),
  query: vi.fn((ref, ...constraints) => ({ type: "query", ref, constraints })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  documentId: vi.fn(() => "__name__"),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  onSnapshot: vi.fn(),
}));

import { getDoc, getDocs, writeBatch } from "firebase/firestore";
import { setEmployeeAccess } from "./employeeAccess";
import {
  convertCandidateToEmployee,
  fetchEmployeesByIds,
  mapEmployee,
  updateEmployeeAndSyncAccess,
} from "./employees";
import { setCurrentCompanyId } from "../shared/tenant";

describe("updateEmployeeAndSyncAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  const mockUpdateBatch = (beforeData: Record<string, unknown>) => {
    vi.mocked(getDoc).mockResolvedValue({ data: () => beforeData } as never);
    const batchUpdate = vi.fn();
    const batchSet = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({
      update: batchUpdate,
      set: batchSet,
      commit: batchCommit,
    } as never);
    return { batchUpdate, batchSet, batchCommit };
  };

  it("deactivates access when the employee transitions into desligado and has a linked account", async () => {
    mockUpdateBatch({ companyId: "acme", status: "ativo" });
    vi.mocked(setEmployeeAccess).mockResolvedValue(undefined);

    const result = await updateEmployeeAndSyncAccess("emp1", { status: "desligado" }, "ativo", "user1");

    expect(setEmployeeAccess).toHaveBeenCalledWith("user1", true);
    expect(result.accessSyncError).toBeUndefined();
  });

  it("does not touch access when the employee wasn't already ativo/ferias before desligado", async () => {
    mockUpdateBatch({ companyId: "acme", status: "desligado" });

    const result = await updateEmployeeAndSyncAccess("emp1", { status: "desligado" }, "desligado", "user1");

    expect(setEmployeeAccess).not.toHaveBeenCalled();
    expect(result.accessSyncError).toBeUndefined();
  });

  it("does not attempt to deactivate access when the employee has no linked account", async () => {
    mockUpdateBatch({ companyId: "acme", status: "ativo" });

    const result = await updateEmployeeAndSyncAccess("emp1", { status: "desligado" }, "ativo", null);

    expect(setEmployeeAccess).not.toHaveBeenCalled();
    expect(result.accessSyncError).toBeUndefined();
  });

  it("surfaces the error without throwing when the access deactivation call fails", async () => {
    mockUpdateBatch({ companyId: "acme", status: "ativo" });
    vi.mocked(setEmployeeAccess).mockRejectedValue(new Error("Only an Admin or Manager can change employee access"));

    const result = await updateEmployeeAndSyncAccess("emp1", { status: "desligado" }, "ativo", "user1");

    expect(result.accessSyncError).toBe("Only an Admin or Manager can change employee access");
  });
});

describe("convertCandidateToEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("creates the employee and marks the candidate converted", async () => {
    const batchSet = vi.fn();
    const batchUpdate = vi.fn();
    const batchCommit = vi.fn().mockResolvedValue(undefined);
    vi.mocked(writeBatch).mockReturnValue({
      set: batchSet,
      update: batchUpdate,
      commit: batchCommit,
    } as never);

    const employeeId = await convertCandidateToEmployee(
      "cand1",
      {
        name: "João",
        email: "joao@x.com",
        phone: "",
        role: "Dev Frontend",
        department: "Tecnologia",
        status: "ativo",
        salary: 5000,
        hireDate: null,
        notes: "",
      },
      { uid: "owner1", name: "Yago" }
    );

    expect(employeeId).toBe("new-employees-id");
    expect(batchSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-employees-id" }),
      expect.objectContaining({ companyId: "acme", name: "João", userId: null })
    );
    expect(batchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ convertedToEmployeeId: "new-employees-id" })
    );
    expect(batchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ entityType: "candidates", action: "update" })
    );
    expect(batchCommit).toHaveBeenCalledOnce();
  });
});

describe("mapEmployee", () => {
  it("defaults the RH-depth fields when absent from the document", () => {
    const employee = mapEmployee({
      id: "e1",
      data: () => ({ name: "Fábio", email: "f@x.com", role: "Dev", department: "TI", status: "ativo", ownerId: "o1" }),
    } as never);

    expect(employee.managerId).toBe("");
    expect(employee.managerName).toBe("");
    expect(employee.contractType).toBe("");
    expect(employee.costCenter).toBe("");
    expect(employee.weeklyHours).toBe(0);
    expect(employee.jobHistory).toEqual([]);
  });

  it("passes through job history entries and contract type", () => {
    const employee = mapEmployee({
      id: "e2",
      data: () => ({
        name: "Ana",
        email: "a@x.com",
        role: "Gerente",
        department: "Vendas",
        status: "ativo",
        ownerId: "o1",
        contractType: "clt",
        weeklyHours: 44,
        managerId: "e1",
        managerName: "Fábio",
        jobHistory: [{ effectiveDate: null, role: "Analista", salary: 3000, reason: "Admissão" }],
      }),
    } as never);

    expect(employee.contractType).toBe("clt");
    expect(employee.weeklyHours).toBe(44);
    expect(employee.managerName).toBe("Fábio");
    expect(employee.jobHistory).toHaveLength(1);
    expect(employee.jobHistory?.[0].role).toBe("Analista");
  });
});

describe("fetchEmployeesByIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentCompanyId("acme");
  });

  it("returns an empty array without querying when given no ids", async () => {
    expect(await fetchEmployeesByIds([])).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("returns employees mapped from the snapshot", async () => {
    const docs = [{ id: "e1", data: () => ({ name: "Fábio", costPerHour: 10, ownerId: "o1" }) }];
    vi.mocked(getDocs).mockResolvedValue({ docs } as never);

    const employees = await fetchEmployeesByIds(["e1"]);

    expect(employees).toHaveLength(1);
    expect(employees[0].costPerHour).toBe(10);
  });

  it("batches lookups in groups of 30 ids", async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);
    const ids = Array.from({ length: 35 }, (_, i) => `e${i}`);

    await fetchEmployeesByIds(ids);

    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
