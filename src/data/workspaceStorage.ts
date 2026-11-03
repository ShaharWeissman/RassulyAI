import type { AppData } from "../types";
import { mockData } from "./mockData";
import { applyPresentationUpdates } from "./presentationUpdates";

const storageKey = "rassuly-workspace-v2";

export function loadWorkspace(): AppData {
  try {
    const value = localStorage.getItem(storageKey);
    if (value) {
      const stored = JSON.parse(value) as { version?: number; data?: AppData };
      if (
        (stored.version === 2 || stored.version === 3) &&
        stored.data &&
        Object.keys(mockData).every((key) =>
          Array.isArray(stored.data?.[key as keyof AppData]),
        ) &&
        stored.data.projects.length === mockData.projects.length &&
        mockData.projects.every((p) =>
          stored.data!.projects.some((saved) => saved.id === p.id),
        )
      )
        return applyPresentationUpdates(stored.data, stored.version);
    }
  } catch {
    /* Missing or invalid local storage falls back to the workbook snapshot. */
  }
  return applyPresentationUpdates(mockData, 0);
}

export function saveWorkspace(data: AppData): boolean {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ version: 3, data: applyPresentationUpdates(data, 3) }),
    );
    return true;
  } catch {
    return false;
  }
}
