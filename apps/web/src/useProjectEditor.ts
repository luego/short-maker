import { useEffect, useState } from "react";
import { apiRequest, withSourceUrl, type Project } from "./api";

export function useProjectEditor(
  projectId?: string,
  onProjectSaved?: (project: Project) => void,
) {
  const [video, setVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [template, setTemplate] = useState("roblox-rant");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (!projectId) {
      setLoadingProject(false);
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
        const body = await apiRequest<Project>(
          `/api/projects/${projectId}`,
          "Unable to load project.",
        );
        if (!ignore) {
          const loaded = withSourceUrl(body);
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

  const saveProject = async () => {
    if (!projectName.trim()) {
      setError("Enter a project name before uploading a video.");
      return;
    }

    setSavingProject(true);
    setError(null);
    try {
      const body = await apiRequest<Project>(
        project ? `/api/projects/${project.id}` : "/api/projects",
        "Unable to save the project.",
        {
          method: project ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            templateId: template,
          }),
        },
      );
      const saved = withSourceUrl(body);
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
      const updated = withSourceUrl(
        await apiRequest<Project>(
          `/api/projects/${project.id}/source-video`,
          "Unable to import the video.",
          { method: "POST", body: formData },
        ),
      );
      setProject(updated);
      setPreviewUrl(updated.sourceUrl ?? null);
      setVideo(null);
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

  return {
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
  };
}
