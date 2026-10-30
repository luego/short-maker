import { apiRequest } from "./api";
import { Clapperboard, Film, HardDrive, Plus } from "lucide-react";
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
    <aside className="workspace-sidebar" aria-label="Project navigation">
      <div className="brand">
        <span className="brand-icon">
          <Clapperboard size={19} />
        </span>
        <span>
          short<span className="brand-light">maker</span>
          <small>CREATOR STUDIO</small>
        </span>
      </div>
      <div className="sidebar-create">
        <button type="button" onClick={onSelectNew} className="button-primary">
          <Plus size={16} />
          New Project
        </button>
      </div>
      <div className="sidebar-section-label">
        Your projects <span>{projects.length}</span>
      </div>
      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
      <ul className="project-list">
        {projects.length === 0 && !error ? (
          <li className="px-3 py-2 text-sm text-gray-500">No projects yet.</li>
        ) : null}
        {projects.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              onClick={() => onSelectProject(project.id)}
              className={`project-link ${project.id === selectedProjectId ? "is-selected" : ""}`}
              aria-current={
                project.id === selectedProjectId ? "page" : undefined
              }
            >
              <span className="project-icon">
                <Film size={16} />
              </span>
              <span className="project-link-copy">
                <strong>{project.name}</strong>
                <small>{project.sourceFilename ?? "No source video"}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <HardDrive size={16} />
        <div>
          <strong>Made on your machine.</strong>
          <p>Your media stays local.</p>
        </div>
      </div>
    </aside>
  );
}
