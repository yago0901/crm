import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  computeProjectCostBreakdown,
  countBusinessDays,
  estimateAllocationCost,
} from "./projectCosts";
import { IProject } from "../../types/project";
import { IResourceAllocation } from "../../types/resourceAllocation";
import { IProjectMilestone } from "../../types/projectMilestone";
import { IPurchaseOrder } from "../../types/purchaseOrder";
import { IEmployee } from "../../types/employee";

const dateIn = (year: number, month: number, day: number) =>
  Timestamp.fromDate(new Date(year, month - 1, day));

const makeProject = (overrides: Partial<IProject> = {}): IProject => ({
  id: "proj1",
  companyId: "acme",
  name: "Implantação ERP",
  description: "",
  budget: 10000,
  startDate: null,
  endDate: null,
  status: "em_andamento",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makeAllocation = (overrides: Partial<IResourceAllocation> = {}): IResourceAllocation => ({
  id: "alloc1",
  companyId: "acme",
  projectId: "proj1",
  projectName: "Implantação ERP",
  employeeId: "emp1",
  employeeName: "Fábio",
  role: "Dev",
  allocationPercent: 100,
  startDate: null,
  endDate: null,
  status: "ativa",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makeEmployee = (overrides: Partial<IEmployee> = {}): IEmployee => ({
  id: "emp1",
  companyId: "acme",
  name: "Fábio",
  email: "fabio@acme.com",
  phone: "",
  role: "Dev",
  department: "Produção",
  status: "ativo",
  salary: 5000,
  hireDate: null,
  costPerHour: 10,
  notes: "",
  userId: null,
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makeMilestone = (overrides: Partial<IProjectMilestone> = {}): IProjectMilestone => ({
  id: "mile1",
  companyId: "acme",
  projectId: "proj1",
  projectName: "Implantação ERP",
  title: "Entrega 1",
  dueDate: null,
  estimatedCost: 0,
  actualCost: 0,
  status: "pendente",
  notes: "",
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

const makePurchaseOrder = (overrides: Partial<IPurchaseOrder> = {}): IPurchaseOrder => ({
  id: "po1",
  companyId: "acme",
  supplierId: "sup1",
  supplierName: "Fornecedor X",
  description: "Materiais",
  value: 0,
  status: "aprovado",
  orderDate: null,
  expectedDate: null,
  notes: "",
  receivedProcessedAt: null,
  ownerId: "owner1",
  ownerName: "Owner",
  createdAt: null,
  updatedAt: null,
  ...overrides,
});

describe("countBusinessDays", () => {
  it("counts Monday through Friday as 5 business days", () => {
    expect(countBusinessDays(new Date(2026, 0, 5), new Date(2026, 0, 9))).toBe(5);
  });

  it("excludes weekend days", () => {
    expect(countBusinessDays(new Date(2026, 0, 3), new Date(2026, 0, 4))).toBe(0);
  });

  it("returns 0 when end is before start", () => {
    expect(countBusinessDays(new Date(2026, 0, 10), new Date(2026, 0, 5))).toBe(0);
  });
});

describe("estimateAllocationCost", () => {
  it("returns 0 when there is no start date", () => {
    const allocation = makeAllocation({ startDate: null });
    expect(estimateAllocationCost(allocation, 10)).toBe(0);
  });

  it("computes cost from business days x 8h x allocation% x cost/hour", () => {
    const allocation = makeAllocation({
      startDate: dateIn(2026, 1, 5),
      endDate: dateIn(2026, 1, 9),
      allocationPercent: 100,
    });
    expect(estimateAllocationCost(allocation, 10)).toBe(400);
  });

  it("scales down with a lower allocation percentage", () => {
    const allocation = makeAllocation({
      startDate: dateIn(2026, 1, 5),
      endDate: dateIn(2026, 1, 9),
      allocationPercent: 50,
    });
    expect(estimateAllocationCost(allocation, 10)).toBe(200);
  });

  it("uses the provided 'today' as the end date when the allocation has no endDate", () => {
    const allocation = makeAllocation({
      startDate: dateIn(2026, 1, 5),
      endDate: null,
      allocationPercent: 100,
    });
    expect(estimateAllocationCost(allocation, 10, new Date(2026, 0, 9))).toBe(400);
  });
});

describe("computeProjectCostBreakdown", () => {
  it("sums labor, milestones and non-cancelled purchases against the budget", () => {
    const project = makeProject({ budget: 1000 });
    const allocations = [
      makeAllocation({
        employeeId: "emp1",
        startDate: dateIn(2026, 1, 5),
        endDate: dateIn(2026, 1, 9),
        allocationPercent: 100,
      }),
    ];
    const employeesById = new Map([["emp1", makeEmployee({ costPerHour: 10 })]]);
    const milestones = [makeMilestone({ actualCost: 100 })];
    const purchaseOrders = [
      makePurchaseOrder({ value: 50, status: "aprovado" }),
      makePurchaseOrder({ id: "po2", value: 999, status: "cancelado" }),
    ];

    const breakdown = computeProjectCostBreakdown(
      project,
      allocations,
      employeesById,
      milestones,
      purchaseOrders
    );

    expect(breakdown.laborCost).toBe(400);
    expect(breakdown.milestonesCost).toBe(100);
    expect(breakdown.purchasesCost).toBe(50);
    expect(breakdown.totalCost).toBe(550);
    expect(breakdown.difference).toBe(450);
  });

  it("reports a negative difference when the project is over budget", () => {
    const project = makeProject({ budget: 100 });
    const milestones = [makeMilestone({ actualCost: 500 })];

    const breakdown = computeProjectCostBreakdown(project, [], new Map(), milestones, []);

    expect(breakdown.totalCost).toBe(500);
    expect(breakdown.difference).toBe(-400);
  });

  it("treats an employee missing from the map as costing 0 per hour", () => {
    const project = makeProject();
    const allocations = [
      makeAllocation({
        employeeId: "unknown",
        startDate: dateIn(2026, 1, 5),
        endDate: dateIn(2026, 1, 9),
      }),
    ];

    const breakdown = computeProjectCostBreakdown(project, allocations, new Map(), [], []);

    expect(breakdown.laborCost).toBe(0);
  });
});
