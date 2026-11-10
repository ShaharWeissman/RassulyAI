export type PageDestination =
  | "dashboard"
  | "office"
  | "billing"
  | "clients"
  | "car"
  | "personal"
  | "tasks"
  | "contacts";
export type ProjectDestination =
  | "data"
  | "costs"
  | "tasks"
  | "protocols"
  | "office";
type Destination = { page: PageDestination } | { module: ProjectDestination };
export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
  target?: Destination;
  audience?: "admin" | "employee";
  projectOnly?: boolean;
};
type NavigationGroup = {
  id: string;
  label: string;
  icon: string;
  audience?: NavigationItem["audience"];
  items: NavigationItem[];
};

const groups: NavigationGroup[] = [
  {
    id: "projects",
    label: "פרויקטים",
    icon: "building",
    items: [
      {
        id: "project-list",
        label: "רשימת פרויקטים",
        icon: "grid",
        target: { page: "dashboard" },
      },
      {
        id: "project-data",
        label: "נתוני פרויקט",
        icon: "building",
        target: { module: "data" },
        projectOnly: true,
      },
      {
        id: "project-costs",
        label: "עלויות פרויקט",
        icon: "file",
        target: { module: "costs" },
        projectOnly: true,
      },
      {
        id: "project-office",
        label: "סטטוס בפרויקט",
        icon: "status",
        target: { module: "office" },
        projectOnly: true,
      },
      { id: "contractor-billing", label: "חשבונות קבלן", icon: "file" },
      { id: "handover", label: "מסירות", icon: "check" },
      {
        id: "project-tasks",
        label: "משימות פרויקט",
        icon: "status",
        target: { module: "tasks" },
      },
      {
        id: "protocols",
        label: "פרוטוקולים",
        icon: "file",
        target: { module: "protocols" },
      },
      { id: "documents", label: "מסמכים", icon: "file" },
    ],
  },
  {
    id: "office",
    label: "משרד",
    icon: "status",
    items: [
      {
        id: "office-status",
        label: "סטטוס פרויקטים משרדי",
        icon: "status",
        target: { page: "office" },
      },
      {
        id: "office-billing",
        label: "הגשת חשבונות משרדיים",
        icon: "file",
        target: { page: "billing" },
      },
      { id: "tenders", label: "מכרזים", icon: "file" },
      {
        id: "clients",
        label: "לקוחות",
        icon: "building",
        target: { page: "clients" },
        audience: "admin",
      },
    ],
  },
  {
    id: "personal",
    label: "האזור שלי",
    icon: "user",
    audience: "employee",
    items: [
      {
        id: "car",
        label: "דיווח רכב וקילומטראז׳",
        icon: "car",
        target: { page: "car" },
      },
      {
        id: "leave",
        label: "חופשות, היעדרויות ומחלה",
        icon: "clock",
        target: { page: "personal" },
      },
      { id: "reserve", label: "דיווח מילואים", icon: "calendar" },
      {
        id: "my-tasks",
        label: "המשימות שלי",
        icon: "status",
        target: { page: "tasks" },
      },
    ],
  },
  {
    id: "contacts",
    label: "אנשי קשר",
    icon: "user",
    items: [
      {
        id: "directory",
        label: "ספר טלפונים ארגוני",
        icon: "user",
        target: { page: "contacts" },
      },
      { id: "external", label: "אנשי קשר חיצוניים", icon: "building" },
    ],
  },
  {
    id: "tools",
    label: "כלים חכמים",
    icon: "sparkles",
    items: [
      { id: "skills", label: "Skills ארגוניים", icon: "grid" },
      {
        id: "transcribe",
        label: "תמלול ישיבה בפרוטוקול",
        icon: "file",
        target: { module: "protocols" },
      },
      { id: "document-ai", label: "כלי AI ועיבוד מסמכים", icon: "sparkles" },
    ],
  },
  {
    id: "admin",
    label: "ניהול מערכת",
    icon: "status",
    audience: "admin",
    items: [
      {
        id: "employee-tasks",
        label: "משימות עובדים",
        icon: "status",
        target: { page: "tasks" },
      },
      {
        id: "car-reports",
        label: "דיווחי רכב",
        icon: "car",
        target: { page: "car" },
      },
      {
        id: "sickness-reports",
        label: "אישור חופשות ומחלה",
        icon: "clock",
        target: { page: "personal" },
      },
      { id: "users", label: "ניהול משתמשים", icon: "user" },
      { id: "roles", label: "הרשאות ותפקידים", icon: "status" },
      { id: "settings", label: "הגדרות מערכת", icon: "edit" },
      { id: "data-management", label: "ניהול נתוני מערכת", icon: "file" },
    ],
  },
];

export function navigationFor(admin: boolean) {
  const role = admin ? "admin" : "employee";
  const visible = ({ audience }: { audience?: NavigationItem["audience"] }) =>
    !audience || audience === role;
  return groups.filter(visible).map((group) => ({
    ...group,
    items: group.items
      .filter(visible)
      .map((item) =>
        admin && item.id === "project-list"
          ? { ...item, label: "כלל הפרויקטים" }
          : item,
      ),
  }));
}

export function navigationPageTitle(page: string, admin: boolean) {
  return navigationFor(admin)
    .flatMap((group) => group.items)
    .find(
      (item) =>
        item.target && "page" in item.target && item.target.page === page,
    )?.label;
}
