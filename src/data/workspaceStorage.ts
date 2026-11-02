import type { AppData } from "../types";
import { mockData } from "./mockData";

const storageKey = "rassuly-workspace-v2";

export function loadWorkspace(): AppData {
  try {
    const value = localStorage.getItem(storageKey);
    if (value) {
      const stored = JSON.parse(value) as { version?: number; data?: AppData };
      if (
        stored.version === 2 &&
        stored.data &&
        Object.keys(mockData).every((key) =>
          Array.isArray(stored.data?.[key as keyof AppData]),
        ) &&
        stored.data.projects.length === mockData.projects.length &&
        mockData.projects.every((p) =>
          stored.data!.projects.some((saved) => saved.id === p.id),
        )
      )
        return stored.data;
    }
  } catch {
    /* Missing or invalid local storage falls back to the workbook snapshot. */
  }
  return mockData;
}

export function saveWorkspace(data: AppData): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 2, data }));
    return true;
  } catch {
    return false;
  }
}
