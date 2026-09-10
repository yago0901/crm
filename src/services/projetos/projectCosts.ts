import { IProject } from "../../types/project";
import { IResourceAllocation } from "../../types/resourceAllocation";
import { IProjectMilestone } from "../../types/projectMilestone";
import { IPurchaseOrder } from "../../types/purchaseOrder";
import { IEmployee } from "../../types/employee";
import { fetchAllocationsByProject } from "./resourceAllocations";
import { fetchMilestonesByProject } from "./projectMilestones";
import { fetchPurchaseOrdersByProject } from "../estoques-logistica/purchaseOrders";
import { fetchEmployeesByIds } from "../rh/employees";

const STANDARD_HOURS_PER_DAY = 8;

export function countBusinessDays(start: Date, end: Date): number {
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  if (last < cur) return 0;

  let count = 0;
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function estimateAllocationCost(
  allocation: IResourceAllocation,
  costPerHour: number,
  today: Date = new Date()
): number {
  if (!allocation.startDate) return 0;

  const start = allocation.startDate.toDate();
  const end = allocation.endDate ? allocation.endDate.toDate() : today;
  const businessDays = countBusinessDays(start, end);
  const hours = businessDays * STANDARD_HOURS_PER_DAY * (allocation.allocationPercent / 100);
  return hours * costPerHour;
}

export interface IProjectCostBreakdown {
  budget: number;
  laborCost: number;
  milestonesCost: number;
  purchasesCost: number;
  totalCost: number;
  difference: number;
}

export function computeProjectCostBreakdown(
  project: IProject,
  allocations: IResourceAllocation[],
  employeesById: Map<string, IEmployee>,
  milestones: IProjectMilestone[],
  purchaseOrders: IPurchaseOrder[],
  today: Date = new Date()
): IProjectCostBreakdown {
  const laborCost = allocations.reduce((sum, allocation) => {
    const costPerHour = employeesById.get(allocation.employeeId)?.costPerHour ?? 0;
    return sum + estimateAllocationCost(allocation, costPerHour, today);
  }, 0);

  const milestonesCost = milestones.reduce((sum, m) => sum + (m.actualCost || 0), 0);

  const purchasesCost = purchaseOrders
    .filter((po) => po.status !== "cancelado")
    .reduce((sum, po) => sum + po.value, 0);

  const totalCost = laborCost + milestonesCost + purchasesCost;

  return {
    budget: project.budget,
    laborCost,
    milestonesCost,
    purchasesCost,
    totalCost,
    difference: project.budget - totalCost,
  };
}

export async function fetchProjectCostBreakdown(
  project: IProject
): Promise<IProjectCostBreakdown> {
  const [allocations, milestones, purchaseOrders] = await Promise.all([
    fetchAllocationsByProject(project.id),
    fetchMilestonesByProject(project.id),
    fetchPurchaseOrdersByProject(project.id),
  ]);

  const employeeIds = Array.from(
    new Set(allocations.map((a) => a.employeeId).filter((id): id is string => Boolean(id)))
  );
  const employees = await fetchEmployeesByIds(employeeIds);
  const employeesById = new Map(employees.map((e) => [e.id, e]));

  return computeProjectCostBreakdown(project, allocations, employeesById, milestones, purchaseOrders);
}
