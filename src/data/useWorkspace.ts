import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "../types";
import { cloudEnabled, persistWorkspace } from "./cloudWorkspace";
import { loadWorkspace, saveWorkspace } from "./workspaceStorage";

const empty: AppData = {
  workers: [],
  projects: [],
  project_assignments: [],
  project_status_updates: [],
  office_project_status: [],
  requirements_tasks: [],
  project_costs: [],
  protocols: [],
  vehicles: [],
  mileage_entries: [],
  leave_requests: [],
};

export function useWorkspace() {
  const [data, setData] = useState<AppData>(() =>
    cloudEnabled ? empty : loadWorkspace(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(data);
  const revision = useRef(0);
  const inFlight = useRef(false);
  const pending = data !== saved;

  useEffect(() => {
    if (!pending || error || inFlight.current) return;
    if (!cloudEnabled) {
      if (saveWorkspace(data)) setSaved(data);
      else setError("השמירה בדפדפן נכשלה. הורד גיבוי לפני סגירת העמוד.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    persistWorkspace(data, revision.current)
      .then((nextRevision) => {
        revision.current = nextRevision;
        setSaved(data);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "השמירה נכשלה.");
      })
      .finally(() => {
        inFlight.current = false;
        setSaving(false);
      });
  }, [data, pending, error, saving]);

  useEffect(() => {
    if (!pending) return;
    const preventClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventClose);
    return () => window.removeEventListener("beforeunload", preventClose);
  }, [pending]);

  const initialize = useCallback((value: AppData, version: number) => {
    revision.current = version;
    setSaved(value);
    setData(value);
    setError("");
  }, []);

  function downloadBackup() {
    const blob = new Blob([JSON.stringify({ version: 3, data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rassuly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    data,
    setData,
    initialize,
    pending,
    saving,
    error,
    retry: () => setError(""),
    downloadBackup,
  };
}
