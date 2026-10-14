import { useEffect, useState } from "react";
import { apiRequest, ApiRequestError } from "./api";

export type RenderJob = {
  id: string;
  status: string;
  progress: number;
  errorMessage: string | null;
  outputUrl: string | null;
};

export function useRenderJob(projectId?: string) {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [renderId, setRenderId] = useState<string | null>(null);

  useEffect(() => {
    setJob(null);
    setPollingError(null);
    setRenderId(projectId ? localStorage.getItem(`render:${projectId}`) : null);
  }, [projectId]);

  useEffect(() => {
    if (!renderId) return;
    let ignore = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const updated = await apiRequest<RenderJob>(
          `/api/renders/${renderId}`,
          "Unable to refresh render status. Retrying…",
        );
        if (ignore) return;
        setJob(updated);
        setPollingError(null);
        if (updated.status === "completed" || updated.status === "failed")
          return;
      } catch (error) {
        if (ignore) return;
        setPollingError(
          error instanceof Error
            ? error.message
            : "Unable to refresh render status. Retrying…",
        );
        if (error instanceof ApiRequestError && error.status === 404) {
          setRenderId(null);
          if (projectId) localStorage.removeItem(`render:${projectId}`);
          return;
        }
      }
      if (!ignore) timer = setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [renderId, projectId]);

  const trackRender = (created: RenderJob) => {
    if (projectId) localStorage.setItem(`render:${projectId}`, created.id);
    setJob(created);
    setPollingError(null);
    setRenderId(created.id);
  };

  const rendering = Boolean(
    renderId && (!job || !["completed", "failed"].includes(job.status)),
  );
  return { job, pollingError, rendering, trackRender };
}
