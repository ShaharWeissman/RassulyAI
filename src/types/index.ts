export const stages = [
  "תכנון ראשוני",
  "תכנון מפורט",
  "מכרז",
  "התקשרות",
  "ביצוע שוטף",
  "מסירות",
  "חשבון סופי",
  "שנת בדק",
  "אחר",
  "טרם הוגדר",
] as const;
export type Stage = (typeof stages)[number];
export type ProjectStatus = "פעיל" | "בהמתנה" | "הושלם";
export interface Worker {
  id: string;
  name: string;
  email: string;
}
export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  current_stage: Stage;
  project_type: "תכנון" | "ביצוע" | "";
  code: string;
  manager_tasks?: string;
}
export interface ProjectAssignment {
  project_id: string;
  worker_id: string;
}
export interface ProjectStatusUpdate {
  id: string;
  project_id: string;
  current_stage: Stage;
  updated_at: string;
  worker_id: string;
}
export interface OfficeProjectStatus {
  project_id: string;
  condition: "תקין" | "דורש תשומת לב" | "דורש טיפול" | "לא סווג";
  updated_at: string;
  short_status: string;
  manager_issue: string;
  detailed_status: string;
  stage_due_date: string;
  budget: number | null;
  budget_notes: string;
  update_owner: string;
  major_issues: string;
  followup_date: string;
  manager_notes: string;
  source: { workbook: string; sheet: string; row: number };
}
export type TaskStatus = "פתוח" | "בטיפול" | "הושלם" | "באיחור";
export interface RequirementTask {
  id: string;
  project_id: string;
  title: string;
  assignee: string;
  priority: "רגילה" | "גבוהה" | "נמוכה";
  due_date: string;
  status: TaskStatus;
  note: string;
}
export interface ProjectCost {
  id: string;
  project_id: string;
  chapter: string;
  contractual: number;
  approved: number;
  actual: number;
  exceptions: number;
  note: string;
  data_source?: "demo" | "manual";
}
export interface ProtocolItem {
  id: string;
  title: string;
  assignee: string;
  due_date: string;
  status: TaskStatus;
}
export interface Protocol {
  id: string;
  project_id: string;
  protocol_type: string;
  date: string;
  participants: string;
  summary: string;
  items: ProtocolItem[];
  attachments: { name: string; size: number; type: string }[];
}
export interface Vehicle {
  id: string;
  label: string;
}
export interface MileageEntry {
  id: string;
  worker_id: string;
  vehicle_id: string;
  month: string;
  odometer: number;
  note: string;
}
export interface LeaveRequest {
  id: string;
  worker_id: string;
  kind: "חופשה" | "מחלה";
  from_date: string;
  to_date: string;
  note: string;
  status: "ממתין לאישור" | "אושר";
}
export interface AppData {
  presentation_revision?: number;
  workers: Worker[];
  projects: Project[];
  project_assignments: ProjectAssignment[];
  project_status_updates: ProjectStatusUpdate[];
  office_project_status: OfficeProjectStatus[];
  requirements_tasks: RequirementTask[];
  project_costs: ProjectCost[];
  protocols: Protocol[];
  vehicles: Vehicle[];
  mileage_entries: MileageEntry[];
  leave_requests: LeaveRequest[];
}
