import { useState } from "react";
import CreateProjectScreen from "./CreateProjectScreen";
import Sidebar from "./Sidebar";
import { ArrowUpRight, Captions, Clapperboard } from "lucide-react";

type Project = {
  id: string;
  name: string;
};

export default function AppShell() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [editorKey, setEditorKey] = useState("new");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProjectSaved = (project: Project) => {
    setSelectedProjectId(project.id);
    setIsCreating(false);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="workspace-shell">
      <Sidebar
        selectedProjectId={selectedProjectId}
        refreshKey={refreshKey}
        onSelectNew={() => {
          setEditorKey(crypto.randomUUID());
          setSelectedProjectId(null);
          setIsCreating(true);
        }}
        onSelectProject={(id) => {
          setEditorKey(id);
          setSelectedProjectId(id);
          setIsCreating(false);
        }}
      />
      <main className="workspace-main">
        <div className="workspace-topbar">
          <span>
            <Clapperboard size={15} />
            Creator workspace
          </span>
          <span className="local-status">
            <i />
            Local studio
          </span>
        </div>
        <div className="workspace-content">
          {isCreating || selectedProjectId ? (
            <CreateProjectScreen
              key={editorKey}
              projectId={selectedProjectId ?? undefined}
              onProjectSaved={handleProjectSaved}
            />
          ) : (
            <div className="workspace-empty">
              <div className="empty-mark">
                <Captions size={32} strokeWidth={1.5} />
              </div>
              <span className="eyebrow">YOUR NEXT STORY STARTS HERE</span>
              <h1>
                Less editing.
                <br />
                More creating.
              </h1>
              <p>
                Turn your gameplay and a good story into a short.
                <br />
                Style the captions, find your voice, and make it yours.
              </p>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setEditorKey(crypto.randomUUID());
                  setSelectedProjectId(null);
                  setIsCreating(true);
                }}
              >
                Create a project
                <ArrowUpRight size={17} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
