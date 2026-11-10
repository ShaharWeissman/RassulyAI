import { createClient } from "@supabase/supabase-js";
import type { AppData, LeaveRequest, Worker } from "../types";
import { demoWorkers } from "./auth";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudEnabled = Boolean(url && key);
export const configurationMissing =
  !cloudEnabled && (!import.meta.env.DEV || Boolean(url || key));
export const cloudClient = cloudEnabled ? createClient(url, key) : null;
const client = cloudClient;

export interface CloudWorkspace {
  data: AppData;
  revision: number;
}

export async function signIn(email: string, password: string) {
  if (!client) throw new Error("חיבור השרת טרם הוגדר.");
  if (!demoWorkers.some((worker) => worker.email === email))
    throw new Error("כתובת הדוא״ל אינה משויכת לחשבון בדיקה.");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    throw new Error("הכניסה נכשלה. יש לבדוק דוא״ל וסיסמה וחיבור לרשת.");
  return loadSignedInWorkspace();
}

export async function restoreSession() {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (
    !data.session &&
    error &&
    (error.name === "AuthSessionMissingError" ||
      [
        "refresh_token_not_found",
        "refresh_token_already_used",
        "session_not_found",
        "session_expired",
      ].includes(error.code ?? ""))
  ) {
    return null;
  }
  if (error) throw new Error("לא ניתן לשחזר את החיבור לשרת.");
  return data.session ? loadSignedInWorkspace() : null;
}

async function loadSignedInWorkspace() {
  const workspace = await fetchWorkspace();
  const worker = workspace.data.workers[0] as Worker | undefined;
  if (!worker) throw new Error("המשתמש אינו משויך לפרויקטים.");
  return { ...workspace, worker };
}

export async function approveLeaveRequest(workerId: string, requestId: string) {
  if (!client) throw new Error("אין חיבור לשרת.");
  const { error } = await client.rpc("approve_leave_request", {
    target_worker_id: workerId,
    request_id: requestId,
  });
  if (error?.code === "PGRST202")
    throw new Error("יש להריץ את עדכון מסד הנתונים של בקשות ההיעדרות.");
  if (error) throw new Error("אישור הבקשה נכשל. רענן את הרשימה ונסה שוב.");
}

export async function submitLeaveRequest(
  request: LeaveRequest,
): Promise<CloudWorkspace> {
  if (!client) throw new Error("אין חיבור לשרת.");
  const { data, error } = await client.rpc("submit_leave_request", {
    input: request,
  });
  if (error?.code === "PGRST202")
    throw new Error("יש להריץ את עדכון מסד הנתונים של בקשות ההיעדרות.");
  if (error) throw new Error("שליחת הבקשה נכשלה. בדוק את התאריכים ונסה שוב.");
  return data as CloudWorkspace;
}

export async function fetchWorkspace(
  targetWorkerId: string | null = null,
): Promise<CloudWorkspace> {
  if (!client) throw new Error("חיבור השרת טרם הוגדר.");
  const { data, error } = await client.rpc("load_workspace", {
    target_worker_id: targetWorkerId,
  });
  if (error)
    throw new Error(
      "לא ניתן לטעון נתונים מהשרת. בדוק שהוקמו הטבלאות ושויך המשתמש.",
    );
  if (
    !data ||
    !Number.isInteger(data.revision) ||
    !data.data ||
    !Array.isArray(data.data.workers) ||
    data.data.workers.length !== 1 ||
    !Array.isArray(data.data.projects)
  )
    throw new Error(
      "השרת החזיר נתונים לא תקינים. יש לבדוק את הגדרת סביבת העבודה.",
    );
  return data as CloudWorkspace;
}

export async function persistWorkspace(
  data: AppData,
  revision: number,
): Promise<number> {
  if (!client) throw new Error("חיבור השרת טרם הוגדר.");
  const result = await client.rpc("save_workspace", {
    payload: data,
    expected_revision: revision,
    target_worker_id: data.workers[0]?.id ?? null,
  });
  if (result.error) {
    if (result.error.message.includes("revision_conflict"))
      throw new Error(
        "הנתונים השתנו בחלון אחר. הורד גיבוי לשינויים שלך ורענן את העמוד לפני עריכה נוספת.",
      );
    throw new Error(
      "השמירה בשרת נכשלה. השינויים ממתינים כאן. בדוק את החיבור ונסה שוב.",
    );
  }
  return result.data as number;
}

export async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
