import { parseTimestampToSeconds } from "@short-maker/shared";
import { useEffect, useState } from "react";
import RenderStatus from "./components/RenderStatus";
import TemplateSelect from "./components/TemplateSelect";
import TimestampInput from "./components/TimestampInput";
import VideoPicker from "./components/VideoPicker";
import VoiceSelect from "./components/VoiceSelect";

type Project = {
  id: string;
  sourceFilename?: string | null;
  sourceDuration?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  sourceFps?: number | null;
  sourceUrl?: string;
};

export default function CreateProjectScreen() {
  const [video, setVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [script, setScript] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [template, setTemplate] = useState("roblox-rant");
  const [voice, setVoice] = useState("default-voice");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timestampError, setTimestampError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [submittingRender, setSubmittingRender] = useState(false);

  useEffect(() => {
    if (!video) {
      setPreviewUrl(null);
      return;
    }
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

  const importVideo = async () => {
    if (!video) return;
    setImporting(true);
    setError(null);
    try {
      const createdResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: video.name.replace(/\.[^.]+$/, ""),
          templateId: template,
        }),
      });
      if (!createdResponse.ok) throw new Error("Unable to create the project.");
      const created = (await createdResponse.json()) as Project;

      const formData = new FormData();
      formData.append("video", video);
      const sourceResponse = await fetch(
        `/api/projects/${created.id}/source-video`,
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
      setProject(sourceBody);
      setPreviewUrl(sourceBody.sourceUrl ?? null);
      setStatus("Source video ready.");
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
      <h2 className="mb-4 text-xl font-semibold">Create New Project</h2>

      <VideoPicker
        file={video}
        previewUrl={previewUrl}
        disabled={importing}
        onFileSelected={(file) => {
          setVideo(file);
          setProject(null);
          setStatus(null);
          setError(null);
        }}
      />
      <button
        type="button"
        disabled={!video || importing}
        onClick={importVideo}
        className="mb-2 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {importing ? "Importing and analyzing…" : "Import source video"}
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
      <TemplateSelect
        templates={templates}
        selected={template}
        onChange={setTemplate}
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
