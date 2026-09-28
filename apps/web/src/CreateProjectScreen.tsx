import { parseTimestampToSeconds } from "@short-maker/shared";
import { useEffect, useState } from "react";
import RenderStatus from "./components/RenderStatus";
import TemplateSelect from "./components/TemplateSelect";
import TimestampInput from "./components/TimestampInput";
import VideoPicker from "./components/VideoPicker";
import VoiceSelect from "./components/VoiceSelect";

type Project = {
  id: string;
  name: string;
  templateId: string;
  sourceFilename?: string | null;
  sourceDuration?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  sourceFps?: number | null;
  sourceUrl?: string;
};

interface CreateProjectScreenProps {
  projectId?: string;
  onProjectSaved?: (project: Project) => void;
}

export default function CreateProjectScreen({
  projectId,
  onProjectSaved,
}: CreateProjectScreenProps) {
  const [video, setVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [script, setScript] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [template, setTemplate] = useState("roblox-rant");
  const [voice, setVoice] = useState("default-voice");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timestampError, setTimestampError] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [importing, setImporting] = useState(false);
  const [submittingRender, setSubmittingRender] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setProjectName("");
      setTemplate("roblox-rant");
      setVideo(null);
      setPreviewUrl(null);
      setStatus(null);
      setError(null);
      return;
    }

    let ignore = false;
    const loadProject = async () => {
      setLoadingProject(true);
      setError(null);
      setVideo(null);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const body = (await response.json()) as Project & {
          error?: { message?: string };
        };
        if (!response.ok) {
          throw new Error(body.error?.message ?? "Unable to load project.");
        }
        if (!ignore) {
          const loaded = {
            ...body,
            sourceUrl: body.sourceFilename
              ? `/api/projects/${body.id}/source-video`
              : undefined,
          };
          setProject(loaded);
          setProjectName(loaded.name);
          setTemplate(loaded.templateId);
          setPreviewUrl(loaded.sourceUrl ?? null);
          setStatus(null);
        }
      } catch (caught) {
        if (!ignore) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load project.",
          );
        }
      } finally {
        if (!ignore) setLoadingProject(false);
      }
    };

    void loadProject();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!video) return;
    const url = URL.createObjectURL(video);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const templates = ["roblox-rant"];
  const voices = ["default-voice"];
  const canGenerate = Boolean(
    project?.sourceFilename &&
    script.trim() &&
    timestamp.trim() &&
    !submittingRender,
  );

  const saveProject = async () => {
    if (!projectName.trim()) {
      setError("Enter a project name before uploading a video.");
      return;
    }

    setSavingProject(true);
    setError(null);
    try {
      const response = await fetch(
        project ? `/api/projects/${project.id}` : "/api/projects",
        {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            templateId: template,
          }),
        },
      );
      const body = (await response.json()) as Project & {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to save the project.");
      }
      const saved = {
        ...body,
        sourceUrl: body.sourceFilename
          ? `/api/projects/${body.id}/source-video`
          : undefined,
      };
      setProject(saved);
      setProjectName(saved.name);
      setTemplate(saved.templateId);
      setPreviewUrl(saved.sourceUrl ?? previewUrl);
      setStatus(
        project
          ? "Project updated."
          : "Project created. Now upload a source video.",
      );
      onProjectSaved?.(saved);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save the project.",
      );
    } finally {
      setSavingProject(false);
    }
  };

  const importVideo = async () => {
    if (!video) return;
    if (!project) {
      setError("Create or choose a project before uploading a video.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("video", video);
      const sourceResponse = await fetch(
        `/api/projects/${project.id}/source-video`,
        {
          method: "POST",
          body: formData,
        },
      );
      const sourceBody = (await sourceResponse.json()) as Project & {
        error?: { message?: string };
      };
      if (!sourceResponse.ok) {
        throw new Error(
          sourceBody.error?.message ?? "Unable to import the video.",
        );
      }
      const updated = {
        ...sourceBody,
        sourceUrl: `/api/projects/${project.id}/source-video`,
      };
      setProject(updated);
      setPreviewUrl(updated.sourceUrl);
      setStatus("Source video ready.");
      onProjectSaved?.(updated);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to import the video.",
      );
    } finally {
      setImporting(false);
    }
  };

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
      const response = await fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          script: script.trim(),
          startSeconds,
          voiceId: voice,
          templateId: template,
        }),
      });
      const body = (await response.json()) as {
        id?: string;
        status?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to create render job.");
      }
      setStatus(`Render job ${body.id} queued.`);
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
          disabled={savingProject || !projectName.trim()}
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
        disabled={importing || !project}
        onFileSelected={(file) => {
          setVideo(file);
          setStatus(null);
          setError(null);
        }}
      />
      <button
        type="button"
        disabled={!video || importing || !project}
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
    </div>
  );
}
