import { parseTimestampToSeconds } from "@short-maker/shared";
import { useState } from "react";
import { apiRequest, type Project } from "./api";
import { useProjectEditor } from "./useProjectEditor";
import RenderProgress from "./components/RenderProgress";
import { useRenderJob, type RenderJob } from "./useRenderJob";
import RenderStatus from "./components/RenderStatus";
import TemplateSelect from "./components/TemplateSelect";
import TimestampInput from "./components/TimestampInput";
import VideoPicker from "./components/VideoPicker";
import VoiceSelect from "./components/VoiceSelect";

interface CreateProjectScreenProps {
  projectId?: string;
  onProjectSaved?: (project: Project) => void;
}

export default function CreateProjectScreen({
  projectId,
  onProjectSaved,
}: CreateProjectScreenProps) {
  const {
    video,
    setVideo,
    previewUrl,
    project,
    projectName,
    setProjectName,
    template,
    setTemplate,
    status,
    setStatus,
    error,
    setError,
    loadingProject,
    savingProject,
    importing,
    saveProject,
    importVideo,
  } = useProjectEditor(projectId, onProjectSaved);
  const [script, setScript] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [voice, setVoice] = useState("default-voice");
  const [timestampError, setTimestampError] = useState<string | null>(null);
  const [submittingRender, setSubmittingRender] = useState(false);

  const { job, pollingError, rendering, trackRender } = useRenderJob(
    project?.id,
  );

  const templates = ["roblox-rant"];
  const voices = ["default-voice"];
  const canGenerate = Boolean(
    project?.sourceFilename &&
    script.trim() &&
    timestamp.trim() &&
    !submittingRender &&
    !rendering &&
    !loadingProject &&
    !savingProject &&
    !importing,
  );

  const submitRender = async () => {
    setError(null);
    setTimestampError(null);

    if (!project?.id || !project.sourceFilename) {
      setError("Import a source video before generating a Short.");
      return;
    }

    if (!script.trim()) {
      setError("Enter a script before generating a Short.");
      return;
    }

    let startSeconds: number;
    try {
      startSeconds = parseTimestampToSeconds(timestamp);
    } catch (caught) {
      setTimestampError(
        caught instanceof Error ? caught.message : "Enter a valid start time.",
      );
      return;
    }

    setSubmittingRender(true);
    setStatus(null);
    try {
      const body = await apiRequest<RenderJob>(
        "/api/renders",
        "Unable to create render job.",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            script: script.trim(),
            startSeconds,
            voiceId: voice,
            templateId: template,
          }),
        },
      );
      trackRender(body);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create render job.",
      );
    } finally {
      setSubmittingRender(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-xl font-semibold">
        {project ? `Project: ${project.name}` : "Create New Project"}
      </h2>

      {loadingProject ? (
        <p className="mb-4 text-sm text-gray-600">Loading project…</p>
      ) : null}

      <div className="mb-5 rounded-md border bg-white p-4">
        <label
          className="mb-1 block text-sm font-medium"
          htmlFor="project-name"
        >
          Project name
        </label>
        <input
          id="project-name"
          className="mb-3 w-full rounded border p-2"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="Roblox Rant #1"
        />
        <TemplateSelect
          templates={templates}
          selected={template}
          onChange={setTemplate}
        />
        <button
          type="button"
          disabled={
            loadingProject ||
            rendering ||
            savingProject ||
            importing ||
            !projectName.trim()
          }
          onClick={saveProject}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {savingProject
            ? "Saving…"
            : project
              ? "Save project"
              : "Create project"}
        </button>
        {!project ? (
          <p className="mt-2 text-sm text-gray-500">
            Primero crea o elige un proyecto. Después podrás subir el video a
            ese proyecto.
          </p>
        ) : null}
      </div>

      <VideoPicker
        file={video}
        previewUrl={previewUrl}
        disabled={
          loadingProject || rendering || savingProject || importing || !project
        }
        onFileSelected={(file) => {
          setVideo(file);
          setStatus(null);
          setError(null);
        }}
      />
      <button
        type="button"
        disabled={
          loadingProject ||
          rendering ||
          savingProject ||
          !video ||
          importing ||
          !project
        }
        onClick={importVideo}
        className="mb-2 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {importing ? "Importing and analyzing…" : "Upload source video"}
      </button>
      {project?.sourceFilename && (
        <p className="mb-4 text-sm text-gray-600">
          {project.sourceFilename} · {project.sourceWidth}×
          {project.sourceHeight} · {project.sourceFps?.toFixed(2)} fps ·{" "}
          {project.sourceDuration?.toFixed(2)}s
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <TimestampInput
        value={timestamp}
        error={timestampError}
        onChange={(value) => {
          setTimestamp(value);
          setTimestampError(null);
        }}
      />
      <VoiceSelect voices={voices} selected={voice} onChange={setVoice} />

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium" htmlFor="script">
          Script
        </label>
        <textarea
          id="script"
          className="h-32 w-full rounded border p-2"
          value={script}
          onChange={(event) => setScript(event.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Characters: {script.length}
        </p>
      </div>

      <button
        type="button"
        disabled={!canGenerate}
        onClick={submitRender}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {submittingRender ? "Queuing render…" : "Generate Short"}
      </button>

      {status && <RenderStatus status={status} />}
      {(job || rendering || pollingError) && (
        <RenderProgress job={job} error={pollingError} />
      )}
    </div>
  );
}
