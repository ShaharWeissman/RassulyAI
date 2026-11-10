import { createClient } from "@supabase/supabase-js";
import type { AppData, Worker } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudEnabled = Boolean(url && key);
export const configurationMissing =
  !cloudEnabled && (!import.meta.env.DEV || Boolean(url || key));
const client = cloudEnabled ? createClient(url, key) : null;

export interface CloudWorkspace {
  data: AppData;
  revision: number;
}

export async function signIn(email: string, password: string) {
  if (!client) throw new Error("חיבור השרת טרם הוגדר.");
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error)
    throw new Error("הכניסה נכשלה. יש לבדוק דוא״ל וסיסמה וחיבור לרשת.");
  const workspace = await fetchWorkspace();
  const worker = workspace.data.workers[0] as Worker | undefined;
  if (!worker) throw new Error("המשתמש אינו משויך לפרויקטים.");
  return { ...workspace, worker };
}

let activeWorkerId: string | null = null;

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
  activeWorkerId = targetWorkerId;
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
    target_worker_id: activeWorkerId,
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
  if (client) await client.auth.signOut();
}
