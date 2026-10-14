import type { RenderJob } from "../useRenderJob";

const stageLabels: Record<string, string> = {
  queued: "Waiting to render…",
  generating_audio: "Generating narration…",
  analyzing_audio: "Measuring narration…",
  preparing_video: "Preparing video…",
  generating_captions: "Synchronizing captions�",
  rendering: "Rendering video…",
  completed: "Video ready",
  failed: "Render failed",
};

export default function RenderProgress({
  job,
  error,
}: {
  job: RenderJob | null;
  error: string | null;
}) {
  return (
    <section
      className="mt-4 space-y-3 rounded border bg-white p-4"
      aria-label="Render progress"
    >
      <p role="status">
        {job
          ? (stageLabels[job.status] ?? job.status)
          : "Loading render status…"}
      </p>
      {job && (
        <progress
          className="w-full"
          aria-label="Render progress"
          value={job.progress}
          max={100}
        />
      )}
      {(error || job?.errorMessage) && (
        <p role="alert" className="text-sm text-red-600">
          {error ?? job?.errorMessage}
        </p>
      )}
      {job?.status === "completed" && job.outputUrl && (
        <>
          <video className="mx-auto max-h-96" controls src={job.outputUrl} />
          <a
            className="inline-block text-blue-600 underline"
            href={job.outputUrl}
            download={`${job.id}.mp4`}
          >
            Download MP4
          </a>
        </>
      )}
    </section>
  );
}
