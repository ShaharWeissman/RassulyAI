import type { AppData } from "../types";
import { demoProjectCosts } from "./costDefaults";

// Versioned so the requested presentation corrections apply once to existing
// browser data, without resetting any saved tasks or project status updates.
export function applyPresentationUpdates(
  data: AppData,
  savedVersion: number,
): AppData {
  const clientUpdateApplied =
    savedVersion >= 3 && data.presentation_revision === 1;
  const missingCosts = data.projects.filter(
    (project) =>
      !data.project_costs.some((cost) => cost.project_id === project.id),
  );
  if (clientUpdateApplied && !missingCosts.length) return data;
  return {
    ...data,
    presentation_revision: 1,
    project_costs: [
      ...data.project_costs,
      ...missingCosts.flatMap((project) =>
        demoProjectCosts(
          project.id,
          data.office_project_status.find(
            (status) => status.project_id === project.id,
          )?.budget ?? null,
        ),
      ),
    ],
    projects: clientUpdateApplied
      ? data.projects
      : data.projects.map((project) =>
          ["shahar-6", "shahar-7"].includes(project.id)
            ? { ...project, client: "הדסה עין כרם" }
            : project,
        ),
  };
}
