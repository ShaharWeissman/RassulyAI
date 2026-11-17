import type { CSSProperties } from "react";
import type { ProjectSchedule } from "../../types";

const day = 86400000;
const dateLabel = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const todayInIsrael = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jerusalem",
});
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const scheduleDate = (value: string) => dateLabel.format(new Date(value));

export default function ScheduleTimeline({
  schedule,
  onShowTable,
}: {
  schedule: ProjectSchedule;
  onShowTable: () => void;
}) {
  const today = todayInIsrael.format(new Date());
  const start = Date.parse(schedule.workOrderDate);
  const end = Date.parse(schedule.contractualEndDate);
  const hasRange =
    Number.isFinite(start) && Number.isFinite(end) && end >= start;
  const position = (date: number) =>
    end === start
      ? date < start
        ? 0
        : 100
      : clamp((100 * (date - start)) / (end - start));
  const now = Date.parse(today);
  const elapsed = hasRange ? position(now) : 0;
  const todayStatus = !hasRange
    ? ""
    : now < start
      ? `${Math.round((start - now) / day)} ימים עד תחילת העבודה`
      : now > end
        ? `${Math.round((now - end) / day)} ימים אחרי הסיום החוזי`
        : "";

  return (
    <div className="schedule-timeline" dir="rtl">
      <div className="schedule-timeline-dates flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <strong>צו תחילת עבודה</strong>
          <span>
            {schedule.workOrderDate
              ? scheduleDate(schedule.workOrderDate)
              : "טרם נקבע"}
          </span>
        </div>
        <div>
          <strong>סיום חוזי</strong>
          <span>
            {schedule.contractualEndDate
              ? scheduleDate(schedule.contractualEndDate)
              : "טרם נקבע"}
          </span>
        </div>
      </div>
      <div
        className="schedule-track-wrap"
        style={{ "--today-position": `${elapsed}%` } as CSSProperties}
      >
        <div
          className="schedule-track"
          role={hasRange ? "progressbar" : undefined}
          aria-label="הזמן שחלף מתוך התקופה החוזית"
          aria-valuenow={hasRange ? Math.round(elapsed) : undefined}
        >
          <span className="schedule-elapsed" style={{ width: `${elapsed}%` }} />
        </div>
        {hasRange && (
          <>
            <span className="schedule-today-marker" aria-hidden="true" />
            <span className="schedule-today-label">
              היום · <time dateTime={today}>{scheduleDate(today)}</time>
            </span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {todayStatus && (
          <span className="schedule-today-status">{todayStatus}</span>
        )}
        {!hasRange && (
          <span className="muted">
            יש להזין צו תחילת עבודה וסיום חוזי כדי למקם את היום על הציר.
          </span>
        )}
        <span>
          מסירת פרויקט ·{" "}
          {schedule.handoverDate
            ? scheduleDate(schedule.handoverDate)
            : "טרם נקבעה"}
        </span>
      </div>
      <details className="schedule-gantt">
        <summary>
          לו״ז קבלן
          {schedule.contractor &&
            ` · ${schedule.contractor.activities.length} פעילויות`}
        </summary>
        {schedule.contractor ? (
          <>
            <div className="my-3 flex flex-wrap items-center justify-between gap-2.5">
              <span className="muted">{schedule.contractor.filename}</span>
              <button type="button" onClick={onShowTable}>
                הצגה בטבלה
              </button>
            </div>
            {!hasRange && (
              <p className="muted">
                הזן מועדי חוזה כדי לראות את הפעילויות על הציר.
              </p>
            )}
            <ul>
              {schedule.contractor.activities.map((activity, index) => {
                const from = Date.parse(activity.start);
                const to = Date.parse(activity.end);
                const outside = to < start || from > end;
                const clipped = from < start || to > end;
                const first = position(from);
                const last = position(to);
                return (
                  <li key={index}>
                    <div className="schedule-activity flex flex-wrap items-center justify-between gap-2.5">
                      <strong>{activity.name}</strong>
                      <small>
                        {scheduleDate(activity.start)} –{" "}
                        {scheduleDate(activity.end)}
                        {hasRange &&
                          clipped &&
                          (outside
                            ? " · מחוץ לתקופה החוזית"
                            : " · חורג מהתקופה החוזית")}
                      </small>
                    </div>
                    {hasRange && (
                      <div className="schedule-gantt-row" aria-hidden="true">
                        {!outside && (
                          <span
                            style={{
                              insetInlineStart: `min(${first}%, calc(100% - 3px))`,
                              width: `${last - first}%`,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="muted">טרם יובא לוח זמנים.</p>
        )}
      </details>
    </div>
  );
}
