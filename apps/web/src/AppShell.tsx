import { useState } from "react";
import CreateProjectScreen from "./CreateProjectScreen";
import Sidebar from "./Sidebar";

type Project = {
  id: string;
  name: string;
};

export default function AppShell() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProjectSaved = (project: Project) => {
    setSelectedProjectId(project.id);
    setIsCreating(false);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        selectedProjectId={selectedProjectId}
        refreshKey={refreshKey}
        onSelectNew={() => {
          setSelectedProjectId(null);
          setIsCreating(true);
        }}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setIsCreating(false);
        }}
      />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
        <h1 className="mb-4 text-2xl font-bold">Short Maker</h1>
        {isCreating ? (
          <CreateProjectScreen key="new" onProjectSaved={handleProjectSaved} />
        ) : selectedProjectId ? (
          <CreateProjectScreen
            key={selectedProjectId}
            projectId={selectedProjectId}
            onProjectSaved={handleProjectSaved}
          />
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            Elige un proyecto existente o crea uno nuevo antes de subir un
            video.
          </div>
        )}
      </main>
    </div>
  );
}
