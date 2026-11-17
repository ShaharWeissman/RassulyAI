import type { AppData, Project } from "../types";
import { cloudClient, type CloudWorkspace } from "./cloudWorkspace";

export type CompanyProject = Pick<
  Project,
  "id" | "name" | "client" | "status" | "transferred_from"
> & {
  owner_id: string;
  owner_name: string;
  updated_at: string;
};

export function listLocalProjects(data: AppData): CompanyProject[] {
  return data.project_assignments.flatMap(({ project_id, worker_id }) => {
    const project = data.projects.find((item) => item.id === project_id);
    const owner = data.workers.find((item) => item.id === worker_id);
    if (!project || !owner) return [];
    return [
      {
        id: project.id,
        name: project.name,
        client: project.client,
        status: project.status,
        transferred_from: project.transferred_from,
        owner_id: owner.id,
        owner_name: owner.name,
        updated_at:
          data.office_project_status.find(
            (item) => item.project_id === project_id,
          )?.updated_at ?? "",
      },
    ];
  });
}

export async function listCloudProjects(): Promise<CompanyProject[]> {
  const result = await cloudClient!.rpc("company_projects_list");
  if (result.error?.code === "PGRST202")
    throw new Error("נדרש עדכון מסד הנתונים כדי להציג את פרויקטי החברה.");
  if (result.error) throw new Error("לא ניתן לטעון את פרויקטי החברה.");
  return result.data as CompanyProject[];
}

export async function pullCloudProject(
  project: CompanyProject,
): Promise<CloudWorkspace> {
  const result = await cloudClient!.rpc("company_project_pull", {
    project_id: project.id,
    expected_owner: project.owner_id,
  });
  if (result.error?.message.includes("project_owner_changed"))
    throw new Error("השיוך השתנה. רענן את הרשימה ובחר את הפרויקט מחדש.");
  if (result.error)
    throw new Error("העברת הפרויקט נכשלה. רענן את הרשימה ונסה שוב.");
  return result.data as CloudWorkspace;
}

export function pullLocalProject(
  data: AppData,
  project: CompanyProject,
  workerId: string,
): AppData {
  if (
    !data.project_assignments.some(
      (item) =>
        item.project_id === project.id && item.worker_id === project.owner_id,
    )
  )
    return data;
  return {
    ...data,
    projects: data.projects.map((item) =>
      item.id === project.id
        ? { ...item, transferred_from: project.owner_name }
        : item,
    ),
    project_assignments: data.project_assignments.map((item) =>
      item.project_id === project.id ? { ...item, worker_id: workerId } : item,
    ),
  };
}
