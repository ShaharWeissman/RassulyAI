import type { AppData, Project, OfficeProjectStatus } from "../types";
import { demoWorkers } from "./auth";
import portfolio from "./portfolioData.json";

// Only the main portfolio sheet from each supplied workbook is imported.
export const mockData: AppData = {
  workers: demoWorkers,
  projects: portfolio.projects as Project[],
  project_assignments: portfolio.assignments,
  office_project_status: portfolio.statuses as OfficeProjectStatus[],
  project_status_updates: [],
  requirements_tasks: [
    {
      id: "demo-neuro-1",
      project_id: "shahar-9",
      title: "תיאום גריד מצלמות",
      assignee: "שחר וייסמן",
      priority: "גבוהה",
      due_date: "2026-11-05",
      status: "בטיפול",
      note: "משימת הדגמה",
    },
    {
      id: "demo-neuro-2",
      project_id: "shahar-9",
      title: "השלמת חלון משרד עינת",
      assignee: "שחר וייסמן",
      priority: "רגילה",
      due_date: "2026-11-10",
      status: "פתוח",
      note: "בהתאם לנושא המופיע בסטטוס המשרדי",
    },
    {
      id: "demo-neuro-3",
      project_id: "shahar-9",
      title: "הגשת דקל ל-SPC",
      assignee: "שחר וייסמן",
      priority: "רגילה",
      due_date: "2026-11-10",
      status: "פתוח",
      note: "בהתאם לנושא המופיע בסטטוס המשרדי",
    },
  ],
  // Chapter costs are examples, not the source workbook's budget.
  project_costs: ["בינוי", "חשמל", "מיזוג אוויר", "אינסטלציה", "תקשורת"].map(
    (chapter, i) => ({
      id: `demo-cost-${i}`,
      project_id: "shahar-9",
      chapter,
      contractual: (5 - i) * 200000,
      approved: (5 - i) * 190000,
      actual: (5 - i) * 110000,
      exceptions: i === 2 ? 12000 : 0,
      note: "נתוני עלויות לדוגמה",
    }),
  ),
  protocols: [],
  vehicles: [
    { id: "v1", label: "טויוטה קורולה · 123-45-678" },
    { id: "v2", label: "יונדאי איוניק · 234-56-789" },
  ],
  mileage_entries: [],
  leave_requests: [],
};
