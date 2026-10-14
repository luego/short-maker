import { apiRequest } from "./api";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

type ProjectListItem = {
  id: string;
  name: string;
  sourceFilename?: string | null;
};

export default function Sidebar({
  selectedProjectId,
  refreshKey,
  onSelectNew,
  onSelectProject,
}: {
  selectedProjectId: string | null;
  refreshKey: number;
  onSelectNew: () => void;
  onSelectProject: (id: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadProjects = async () => {
      setError(null);
      try {
        const body = await apiRequest<ProjectListItem[]>(
          "/api/projects",
          "Unable to load projects.",
        );
        if (!ignore) setProjects(body);
      } catch (caught) {
        if (!ignore) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load projects.",
          );
        }
      }
    };

    void loadProjects();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-4">
        <button
          type="button"
          onClick={onSelectNew}
          className="flex w-full items-center rounded px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Plus className="mr-2" size={16} />
          New Project
        </button>
      </div>
      <div className="px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Projects
      </div>
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-1 p-4 pt-2">
        {projects.length === 0 && !error ? (
          <li className="px-3 py-2 text-sm text-gray-500">No projects yet.</li>
        ) : null}
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => onSelectProject(project.id)}
              className={`w-full rounded px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                project.id === selectedProjectId
                  ? "bg-gray-100 font-semibold"
                  : ""
              }`}
            >
              <span className="block truncate">{project.name}</span>
              {project.sourceFilename ? (
                <span className="block truncate text-xs font-normal text-gray-500">
                  {project.sourceFilename}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
