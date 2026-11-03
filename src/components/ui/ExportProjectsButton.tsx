import { useState } from "react";
import type { AppData } from "../../types";
import { downloadExcel, projectsWorkbook } from "../../utils/excel";
export default function ExportProjectsButton({ data }: { data: AppData }) {
  const [error, setError] = useState("");
  return (
    <div className="export-action">
      <button
        onClick={() => {
          try {
            downloadExcel(
              projectsWorkbook(data),
              `פרויקטים-${data.workers[0]?.name ?? "רסולי"}`,
            );
            setError("");
          } catch {
            setError("לא ניתן להפיק את הקובץ. נסה שוב.");
          }
        }}
      >
        ייצוא לאקסל
      </button>
      {error && (
        <small role="alert" className="error">
          {error}
        </small>
      )}
    </div>
  );
}
