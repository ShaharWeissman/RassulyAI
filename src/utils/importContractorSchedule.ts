import type { ProjectSchedule } from "../types";
import { readExcelWorkbook } from "./importProjectCosts";

const headings = {
  name: [
    "פעילות",
    "שם פעילות",
    "משימה",
    "שם משימה",
    "task",
    "task name",
    "activity",
    "activity name",
  ],
  start: [
    "תחילה",
    "התחלה",
    "תאריך התחלה",
    "תאריך תחילה",
    "start",
    "start date",
  ],
  end: ["סיום", "תאריך סיום", "finish", "finish date", "end", "end date"],
};

function activityDate(value: string | number | undefined, date1904: boolean) {
  if (typeof value === "number") {
    const day = Math.floor(value);
    if (day < (date1904 ? 0 : 1) || day > 2957000 || (!date1904 && day === 60))
      return "";
    const epoch = date1904
      ? Date.UTC(1904, 0, 1)
      : Date.UTC(1899, 11, day < 60 ? 31 : 30);
    return new Date(epoch + day * 86400000).toISOString().slice(0, 10);
  }
  const text = value?.trim() ?? "";
  const local = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  const iso = local
    ? `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`
    : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const timestamp = Date.parse(iso);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === iso
    ? iso
    : "";
}

export function importContractorSchedule(bytes: Uint8Array, filename: string) {
  const { sheets, date1904 } = readExcelWorkbook(bytes);
  for (const sheet of sheets) {
    const rows = sheet.rows();
    for (const [index, row] of rows.slice(0, 50).entries()) {
      const column = (labels: string[]) =>
        Object.keys(row).find((key) =>
          labels.includes(
            String(row[key]).trim().replace(/\s+/g, " ").toLowerCase(),
          ),
        );
      const nameColumn = column(headings.name);
      const startColumn = column(headings.start);
      const endColumn = column(headings.end);
      if (!nameColumn || !startColumn || !endColumn) continue;
      const activities: NonNullable<
        ProjectSchedule["contractor"]
      >["activities"] = [];
      let skipped = 0;
      for (const activity of rows.slice(index + 1)) {
        const name = String(activity[nameColumn] ?? "").trim();
        if (!name && !activity[startColumn] && !activity[endColumn]) continue;
        const start = activityDate(activity[startColumn], date1904);
        const end = activityDate(activity[endColumn], date1904);
        if (!name || !start || !end || end < start) {
          skipped++;
          continue;
        }
        if (activities.length === 1000)
          throw new Error("אפשר לייבא עד 1,000 פעילויות בקובץ אחד.");
        activities.push({ name: name.slice(0, 300), start, end });
      }
      if (activities.length)
        return { schedule: { filename, activities }, skipped };
    }
  }
  throw new Error(
    "לא נמצאו פעילויות עם עמודות פעילות, התחלה וסיום ותאריכים תקינים.",
  );
}
