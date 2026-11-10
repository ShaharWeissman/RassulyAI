import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5h11v16M15 10h5v11M2 21h20M8 9h3M8 13h3M8 17h3" />
      </>
    ),
    car: (
      <>
        <path d="m4 10 2-6h12l2 6M3 10h18v8H3zM6 18v3M18 18v3M6 14h2M16 14h2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    status: (
      <>
        <path d="M9 5H4v16h16V5h-5M9 3h6v4H9zM8 12l2 2 5-4M8 18h8" />
      </>
    ),
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    calendar: <path d="M8 3v4m8-4v4M4 10h16M5 5h14l1 1v14l-1 1H5l-1-1V6z" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    sparkles: (
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5zM5 3v4M3 5h4m12 12v4m-2-2h4" />
    ),
    logout: <path d="M9 4H4v16h5M13 12h8m-4-4 4 4-4 4" />,
    check: <path d="m5 12 4 4L19 6" />,
    file: (
      <>
        <path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    edit: (
      <>
        <path d="m4 16-1 5 5-1L21 7l-4-4zM14 6l4 4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.building}
    </svg>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  const text = String(children);
  const tone =
    text === "לא סווג"
      ? "neutral"
      : ["באיחור", "דורש טיפול"].includes(text)
        ? "danger"
        : ["בהמתנה", "ממתין לאישור", "דורש תשומת לב", "גבוהה"].includes(text)
          ? "warning"
          : ["פעיל", "הושלם", "אושר", "תקין"].includes(text)
            ? "success"
            : "info";
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Options({ values }: { values: readonly string[] }) {
  return values.map((v) => <option key={v}>{v}</option>);
}
export function Table({
  headers,
  children,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={id}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="סגירה">
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Icon name="file" size={28} />
      <p>{text}</p>
    </div>
  );
}
