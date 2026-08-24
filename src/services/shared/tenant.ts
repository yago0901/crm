let currentCompanyId: string | null = null;

export function setCurrentCompanyId(companyId: string | null): void {
  currentCompanyId = companyId;
}

export function getCurrentCompanyId(): string | null {
  return currentCompanyId;
}
