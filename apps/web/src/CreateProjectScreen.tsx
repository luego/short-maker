import { useState } from "react";
import {
  Captions,
  Check,
  ChevronRight,
  Clock3,
  Film,
  LoaderCircle,
  Mic2,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  defaultCaptionSettings,
  type CaptionSettings,
} from "@short-maker/shared";
import { apiRequest, type Project } from "./api";
import { getDurationPreview } from "./duration-preview";
import { useProjectEditor } from "./useProjectEditor";
import { useRenderJob, type RenderJob } from "./useRenderJob";
import CaptionPreview from "./components/CaptionPreview";
import RenderProgress from "./components/RenderProgress";
import TimestampInput from "./components/TimestampInput";
import VideoPicker from "./components/VideoPicker";

const voices = [
  { id: "em_alex", name: "Alex", language: "Español" },
  { id: "ef_dora", name: "Dora", language: "Español" },
  { id: "em_santa", name: "Santa", language: "Español" },
  { id: "am_adam", name: "Adam", language: "English" },
  { id: "af_heart", name: "Heart", language: "English" },
];

export default function CreateProjectScreen({
  projectId,
  onProjectSaved,
}: {
  projectId?: string;
  onProjectSaved?: (project: Project) => void;
}) {
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
  const [timestamp, setTimestamp] = useState("00:00");
  const [voice, setVoice] = useState("em_alex");
  const [voiceSpeed, setVoiceSpeed] = useState(1.18);
  const [captionSettings, setCaptionSettings] = useState<CaptionSettings>({
    ...defaultCaptionSettings,
  });
  const [activeTab, setActiveTab] = useState<"captions" | "voice">("captions");
  const [submittingRender, setSubmittingRender] = useState(false);
  const { job, pollingError, rendering, trackRender } = useRenderJob(
    project?.id,
  );
  const duration = getDurationPreview(
    script,
    timestamp,
    video ? null : project?.sourceDuration,
    voiceSpeed,
  );
  const busy =
    loadingProject ||
    savingProject ||
    importing ||
    rendering ||
    submittingRender;
  const canGenerate = Boolean(
    project?.sourceFilename &&
    !video &&
    script.trim() &&
    duration.startSeconds !== null &&
    !duration.startError &&
    !busy,
  );

  const updateCaptions = <K extends keyof CaptionSettings>(
    key: K,
    value: CaptionSettings[K],
  ) => {
    setCaptionSettings((current) => ({ ...current, [key]: value }));
  };

  const submitRender = async () => {
    if (!canGenerate || !project) return;
    setError(null);
    setSubmittingRender(true);
    setStatus(null);
    try {
      const created = await apiRequest<RenderJob>(
        "/api/renders",
        "Unable to create render job.",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            script: script.trim(),
            startSeconds: duration.startSeconds,
            voiceId: voice,
            voiceSpeed,
            captionSettings,
            templateId: template,
          }),
        },
      );
      trackRender(created);
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
    <div className="editor">
      <div className="editor-breadcrumb">
        Projects <ChevronRight size={13} />{" "}
        <span>{project?.name ?? "New project"}</span>
      </div>
      <header className="editor-header">
        <div>
          <h1>{project ? project.name : "Make something worth watching."}</h1>
          <p>One story. Your style. Ready for the feed.</p>
        </div>
        <span className="template-badge">
          <Film size={14} />
          Roblox Rant
        </span>
      </header>

      {loadingProject && (
        <p role="status" className="form-notice">
          Loading your project…
        </p>
      )}
      {error && (
        <p role="alert" className="form-error form-message">
          {error}
        </p>
      )}

      <div className="editor-grid">
        <div className="editor-form">
          <section
            className="editor-card project-details"
            aria-label="Project details"
          >
            <div className="project-fields">
              <div className="field">
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  maxLength={120}
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder="My next Roblox rant"
                />
              </div>
              <div className="field">
                <label htmlFor="template">Template</label>
                <select
                  id="template"
                  value={template}
                  onChange={(event) => setTemplate(event.target.value)}
                >
                  <option value="roblox-rant">Roblox Rant</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="button-secondary save-project"
              disabled={busy || !projectName.trim()}
              onClick={saveProject}
            >
              {savingProject ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {project ? "Save project" : "Create project"}
            </button>
          </section>

          <section className="editor-card" aria-labelledby="source-heading">
            <div className="card-heading">
              <div className="section-icon">
                <Film size={17} />
              </div>
              <div>
                <h2 id="source-heading">The background</h2>
                <p>Choose your gameplay and where it starts.</p>
              </div>
            </div>
            <div className="source-controls">
              <VideoPicker
                file={video}
                disabled={busy || !project}
                onFileSelected={(file) => {
                  setVideo(file);
                  setStatus(null);
                  setError(null);
                }}
              />
              {video && (
                <button
                  type="button"
                  className="button-secondary"
                  disabled={busy || !project}
                  onClick={importVideo}
                >
                  {importing ? "Importing…" : "Import video"}
                </button>
              )}
              <TimestampInput
                value={timestamp}
                error={duration.startError}
                onChange={setTimestamp}
              />
            </div>
            {!project && (
              <p className="field-help">
                Create a project above to import your gameplay.
              </p>
            )}
            {project?.sourceFilename && !video && (
              <p className="source-filename">
                <Check size={14} /> <span>{project.sourceFilename}</span>
                <span>{project.sourceDuration?.toFixed(1)}s</span>
              </p>
            )}
            {video && (
              <p className="field-help">
                Import the selected video before generating.
              </p>
            )}
          </section>

          <section
            className="editor-card story-card"
            aria-labelledby="story-heading"
          >
            <div className="card-heading">
              <div className="section-icon">
                <WandSparkles size={17} />
              </div>
              <div>
                <h2 id="story-heading">Tell your story</h2>
                <p>Start with a hook. Keep it punchy.</p>
              </div>
              <span className="subtle-tag">LIVE CAPTIONS</span>
            </div>
            <label className="sr-only" htmlFor="script">
              Script
            </label>
            <textarea
              id="script"
              maxLength={5000}
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder="Okay, can we talk about this for a second? Because there is NO WAY…"
            />
            <div className="script-meta">
              <span>{duration.wordCount} words</span>
              <span>{script.length.toLocaleString()} / 5,000 characters</span>
            </div>
            <div className="duration-strip" aria-label="Duration check">
              <Clock3 size={16} />
              <div>
                <span>Estimated voice</span>
                <strong>
                  {duration.wordCount
                    ? `${duration.minSeconds.toFixed(1)}–${duration.maxSeconds.toFixed(1)}s`
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Video remaining</span>
                <strong>
                  {duration.remainingSeconds !== null
                    ? `${duration.remainingSeconds.toFixed(1)}s`
                    : "—"}
                </strong>
              </div>
            </div>
            {duration.mayExceedVideo && (
              <p role="status" className="duration-warning">
                {duration.mayExceedEntireVideo
                  ? "This script may outlast the entire video. Shorten it or choose longer gameplay."
                  : "Your narration may outlast the remaining video. Try an earlier start or a shorter script."}
              </p>
            )}
            <p className="field-help">
              Estimate at 140–190 words/min, adjusted for voice speed. Exact
              length is checked after voice generation.
            </p>
          </section>

          <section
            className="editor-card customization-card"
            aria-label="Customize your short"
          >
            <div
              className="settings-tabs"
              role="tablist"
              aria-label="Editor settings"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "captions"
                    : event.key === "End"
                      ? "voice"
                      : activeTab === "captions"
                        ? "voice"
                        : "captions";
                setActiveTab(next);
                document.getElementById(`${next}-tab`)?.focus();
              }}
            >
              <button
                id="captions-tab"
                type="button"
                role="tab"
                tabIndex={activeTab === "captions" ? 0 : -1}
                aria-selected={activeTab === "captions"}
                aria-controls="captions-panel"
                onClick={() => setActiveTab("captions")}
              >
                <Captions size={17} />
                Captions
              </button>
              <button
                id="voice-tab"
                type="button"
                role="tab"
                tabIndex={activeTab === "voice" ? 0 : -1}
                aria-selected={activeTab === "voice"}
                aria-controls="voice-panel"
                onClick={() => setActiveTab("voice")}
              >
                <Mic2 size={17} />
                Voice & delivery
              </button>
            </div>
            {activeTab === "captions" ? (
              <div
                id="captions-panel"
                role="tabpanel"
                aria-labelledby="captions-tab"
                className="settings-content"
              >
                <div className="settings-intro">
                  <h3>Make every word stand out.</h3>
                  <span>Updates as you edit</span>
                </div>
                <div className="settings-grid">
                  <div className="field">
                    <label htmlFor="caption-font">Typeface</label>
                    <select
                      id="caption-font"
                      value={captionSettings.fontFamily}
                      onChange={(event) =>
                        updateCaptions(
                          "fontFamily",
                          event.target.value as CaptionSettings["fontFamily"],
                        )
                      }
                    >
                      {["Arial", "Verdana", "Georgia"].map((font) => (
                        <option key={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="caption-position">Placement</label>
                    <select
                      id="caption-position"
                      value={captionSettings.position}
                      onChange={(event) =>
                        updateCaptions(
                          "position",
                          event.target.value as CaptionSettings["position"],
                        )
                      }
                    >
                      <option value="center">Center stage</option>
                      <option value="lower">Lower third</option>
                    </select>
                  </div>
                  <div className="field range-field">
                    <label htmlFor="caption-size">
                      Size <output>{captionSettings.fontSize}px</output>
                    </label>
                    <input
                      id="caption-size"
                      type="range"
                      min={40}
                      max={110}
                      step={2}
                      value={captionSettings.fontSize}
                      onChange={(event) =>
                        updateCaptions("fontSize", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="field range-field">
                    <label htmlFor="caption-outline">
                      Outline <output>{captionSettings.outline}px</output>
                    </label>
                    <input
                      id="caption-outline"
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={captionSettings.outline}
                      onChange={(event) =>
                        updateCaptions("outline", Number(event.target.value))
                      }
                    />
                  </div>
                </div>
                <div className="color-controls">
                  <span>Text color</span>
                  {(["white", "yellow"] as const).map((color) => (
                    <button
                      type="button"
                      key={color}
                      aria-pressed={captionSettings.color === color}
                      onClick={() => updateCaptions("color", color)}
                    >
                      <i
                        style={{
                          background: color === "white" ? "#fff" : "#ffff00",
                        }}
                      />
                      {color === "white" ? "Classic white" : "Highlight yellow"}
                      {captionSettings.color === color && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                id="voice-panel"
                role="tabpanel"
                aria-labelledby="voice-tab"
                className="settings-content"
              >
                <div className="settings-intro">
                  <h3>A little more attitude.</h3>
                  <span>Generated when you export</span>
                </div>
                <div className="delivery-presets">
                  <button
                    type="button"
                    aria-pressed={voiceSpeed === 1.18}
                    onClick={() => setVoiceSpeed(1.18)}
                  >
                    <Sparkles size={16} />
                    <span>
                      <strong>Roblox rant</strong>
                      <small>Quick, punchy pacing · 1.18×</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={voiceSpeed === 1}
                    onClick={() => setVoiceSpeed(1)}
                  >
                    <Mic2 size={16} />
                    <span>
                      <strong>Natural</strong>
                      <small>A more relaxed delivery · 1.00×</small>
                    </span>
                  </button>
                </div>
                <div className="settings-grid">
                  <div className="field">
                    <label htmlFor="voice">Voice</label>
                    <select
                      id="voice"
                      value={voice}
                      onChange={(event) => setVoice(event.target.value)}
                    >
                      {voices.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name} · {item.language}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field range-field">
                    <label htmlFor="voice-speed">
                      Speaking speed <output>{voiceSpeed.toFixed(2)}×</output>
                    </label>
                    <input
                      id="voice-speed"
                      type="range"
                      min={0.8}
                      max={1.35}
                      step={0.01}
                      value={voiceSpeed}
                      onChange={(event) =>
                        setVoiceSpeed(Number(event.target.value))
                      }
                    />
                  </div>
                </div>
                <p className="field-help">
                  The rant preset increases pacing. Voice emotion and intonation
                  depend on the selected voice and your script. Preview stays
                  silent.
                </p>
              </div>
            )}
          </section>

          <div className="generate-bar">
            <div>
              <strong>Ready when you are.</strong>
              <span>MP4 · 1080 × 1920 · captions included</span>
            </div>
            <button
              type="button"
              className="button-primary"
              disabled={!canGenerate}
              onClick={submitRender}
            >
              {busy && rendering ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Sparkles size={17} />
              )}
              {submittingRender
                ? "Queuing…"
                : rendering
                  ? "Generating…"
                  : "Generate Short"}
            </button>
          </div>
          {status && (
            <p role="status" className="form-notice">
              {status}
            </p>
          )}
          {(job || rendering || pollingError) && (
            <RenderProgress job={job} error={pollingError} />
          )}
        </div>

        <div className="preview-pane">
          <CaptionPreview
            sourceUrl={previewUrl}
            sourceDuration={video ? null : project?.sourceDuration}
            startSeconds={duration.startSeconds ?? 0}
            script={script}
            speed={voiceSpeed}
            settings={captionSettings}
          />
        </div>
      </div>
    </div>
  );
}
