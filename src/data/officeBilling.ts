import { cloudClient } from "./cloudWorkspace";

export const invoiceStatuses = {
  draft: "טרם הוגש",
  submitted: "הוגש",
  pending: "ממתין לאישור",
  approved: "אושר",
  partial: "אושר חלקית",
  correction: "נדרש תיקון",
} as const;

export interface BillingProject {
  id: string;
  name: string;
  client: string;
  manager: string;
  owner_id: string;
  active: boolean;
}
export interface BillingCycle {
  month: string;
  step: number;
  employee_history: boolean;
  employee_amounts: boolean;
}
export interface BillingForecast {
  month: string;
  project_id: string;
  expected: boolean;
  decision?: "approved" | "excluded" | null;
  updated_at: string;
}
export interface BillingInvoice {
  id?: string;
  month: string;
  project_id: string;
  status: keyof typeof invoiceStatuses;
  number?: string;
  submitted_amount?: number | null;
  approved_amount?: number | null;
  submitted_on?: string | null;
  approved_on?: string | null;
  notes?: string;
  revision?: number;
}
export interface BillingDocument {
  id: string;
  invoice_id: string;
  path: string;
  original_name: string;
  uploaded_at: string;
}
export interface BillingAudit {
  id: number;
  month: string;
  project_id: string | null;
  action: string;
  actor: string | null;
  details: { from?: number; to?: number; reason?: string; name?: string };
  created_at: string;
}
export interface BillingData {
  admin: boolean;
  current_month: string;
  projects: BillingProject[];
  cycles: BillingCycle[];
  forecasts: BillingForecast[];
  invoices: BillingInvoice[];
  documents: BillingDocument[];
  audit: BillingAudit[];
}

export async function readBilling(month: string, monthsBack: number) {
  if (!cloudClient) throw new Error("מודול החשבונות זמין לאחר התחברות לשרת.");
  const { data, error } = await cloudClient.rpc("office_billing_read", {
    selected_month: month,
    months_back: monthsBack,
  });
  if (error) {
    if (error.code === "PGRST202")
      throw new Error("יש להפעיל את עדכון מסד הנתונים של מודול החשבונות.");
    throw new Error("טעינת החשבונות נכשלה. בדוק את החיבור ואת ההרשאות.");
  }
  return data as BillingData;
}

const messages: Record<string, string> = {
  billing_unreviewed_forecasts:
    "יש להכריע בכל התחזיות החיוביות לפני שחרור המחזור.",
  billing_invalid_transition:
    "התחנה השתנתה או שהמעבר אינו אפשרי. רענן את הנתונים ובדוק את התחנה.",
  billing_forecast_closed: "חלון התחזיות סגור לפרויקט ולחודש שנבחרו.",
  billing_review_closed: "אפשר לסנן תחזיות רק בתחנת האישור.",
  billing_revision_conflict:
    "החשבון עודכן ממסך אחר. סגור את הכרטסת ורענן לפני שמירה נוספת.",
  billing_access_denied: "אין הרשאה לפעולה הזאת.",
};

export async function writeBilling(
  action: string,
  month: string,
  project: string | null,
  input: object,
) {
  if (!cloudClient) throw new Error("אין חיבור לשרת.");
  const { error } = await cloudClient.rpc("office_billing_write", {
    action,
    billing_month: month,
    project,
    input,
  });
  if (error)
    throw new Error(
      messages[error.message] ?? "השמירה נכשלה. בדוק את השדות ואת החיבור לשרת.",
    );
}

export async function uploadBillingDocument(invoiceId: string, file: File) {
  if (!cloudClient) throw new Error("אין חיבור לשרת.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mime =
    extension === "pdf"
      ? "application/pdf"
      : extension === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : null;
  if (
    !mime ||
    !file.size ||
    file.size > 10 * 1024 * 1024 ||
    file.name.length > 255
  )
    throw new Error("בחר קובץ PDF או XLSX תקין, עד 10 מגה.");
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const signature = extension === "pdf" ? [37, 80, 68, 70, 45] : [80, 75, 3, 4];
  if (!signature.every((byte, index) => header[index] === byte))
    throw new Error("תוכן הקובץ אינו תואם לסוג שנבחר.");
  const path = `${invoiceId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await cloudClient.storage
    .from("office-billing-private")
    .upload(path, file, { contentType: mime, upsert: false });
  if (error) throw new Error("העלאת הקובץ נכשלה.");
  return { path, name: file.name };
}

export async function downloadBillingDocument(document: BillingDocument) {
  if (!cloudClient) throw new Error("אין חיבור לשרת.");
  const { data, error } = await cloudClient.storage
    .from("office-billing-private")
    .createSignedUrl(document.path, 60, { download: document.original_name });
  if (error || !data) throw new Error("אין אפשרות להוריד את הקובץ.");
  const link = window.document.createElement("a");
  link.href = data.signedUrl;
  link.click();
}
