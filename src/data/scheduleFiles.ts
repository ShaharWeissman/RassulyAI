import { cloudClient } from "./cloudWorkspace";

const bucket = "contractor-schedules";
export const pdfType = "application/pdf";
export const scheduleFileTypes = {
  pdf: pdfType,
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
} as const;

export function scheduleFileType(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension && Object.hasOwn(scheduleFileTypes, extension)
    ? scheduleFileTypes[extension as keyof typeof scheduleFileTypes]
    : undefined;
}

function localFile<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("rassuly-schedules", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction("files", mode);
      const request = action(transaction.objectStore("files"));
      transaction.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

export async function storeScheduleFile(
  projectId: string,
  file: File,
  contentType: string,
) {
  const path = `${projectId}/${crypto.randomUUID()}.${file.name.split(".").pop()!.toLowerCase()}`;
  if (cloudClient) {
    const { error } = await cloudClient.storage
      .from(bucket)
      .upload(path, file, { contentType });
    if (error) throw error;
  } else {
    await localFile("readwrite", (files) => files.put(file, path));
  }
  return { path, contentType };
}

export async function loadScheduleFile(path: string, contentType: string) {
  if (cloudClient) {
    const { data, error } = await cloudClient.storage
      .from(bucket)
      .download(path);
    if (error) throw error;
    return data.slice(0, data.size, contentType);
  }
  const file: Blob | undefined = await localFile("readonly", (files) =>
    files.get(path),
  );
  if (!file) throw new Error("Schedule file missing");
  return file.slice(0, file.size, contentType);
}
