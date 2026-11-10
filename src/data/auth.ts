import type { Worker } from "../types";

export const demoWorkers: Worker[] = [
  { id: "admin", name: "מנהל מערכת", email: "tadmin@rassuly-eng.co.il" },
  { id: "shahar", name: "שחר וייסמן", email: "tshaharw@rassuly-eng.co.il" },
  { id: "nave", name: "נווה", email: "tnave@rassuly-eng.co.il" },
];

// Demo-only validation. A deployed internal system needs server-side authentication.
export function authenticateDemo(
  email: string,
  password: string,
): Worker | null {
  if (password !== "1234") return null;
  return (
    demoWorkers.find((worker) => worker.email === email.trim().toLowerCase()) ??
    null
  );
}

export function assignedProjectIds(
  data: { project_assignments: { worker_id: string; project_id: string }[] },
  workerId: string,
) {
  return data.project_assignments
    .filter((a) => a.worker_id === workerId)
    .map((a) => a.project_id);
}
