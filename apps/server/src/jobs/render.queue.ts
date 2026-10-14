import { ApiError } from "../lib/api-error.js";
import type { RenderJobRepository } from "../repositories/render-job.repository.js";
import type { RenderService } from "../services/render.service.js";

export class RenderQueue {
  private readonly pending: string[] = [];
  private readonly active = new Set<string>();
  private running = false;

  constructor(
    private readonly renderer: Pick<RenderService, "render">,
    private readonly jobs: Pick<RenderJobRepository, "markFailed">,
  ) {}

  enqueue(id: string) {
    if (this.active.has(id)) return;
    this.active.add(id);
    this.pending.push(id);
    void this.drain().catch((error: unknown) => {
      console.error(
        JSON.stringify({ event: "queue.failed", message: String(error) }),
      );
    });
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length) {
        const id = this.pending.shift()!;
        const started = Date.now();
        console.log(JSON.stringify({ event: "render.started", renderId: id }));
        try {
          await this.renderer.render(id);
          console.log(
            JSON.stringify({
              event: "render.completed",
              renderId: id,
              elapsedMs: Date.now() - started,
            }),
          );
        } catch (error) {
          const failure =
            error instanceof ApiError
              ? { errorCode: error.code, errorMessage: error.message }
              : {
                  errorCode: "RENDER_FAILED",
                  errorMessage: "Unable to render the video.",
                };
          try {
            await this.jobs.markFailed(id, failure);
          } catch {
            console.error(
              JSON.stringify({ event: "render.status_failed", renderId: id }),
            );
          }
          console.error(
            JSON.stringify({
              event: "render.failed",
              renderId: id,
              code: failure.errorCode,
              elapsedMs: Date.now() - started,
            }),
          );
        } finally {
          this.active.delete(id);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
