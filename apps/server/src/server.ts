import { createApp } from "./app.js";
import { database } from "./db/client.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { RenderJobRepository } from "./repositories/render-job.repository.js";
import { AudioCppService } from "./services/audio-cpp.service.js";
import { MediaService } from "./services/media.service.js";
import { ProbeService } from "./services/probe.service.js";
import { RenderPreparationService } from "./services/render-preparation.service.js";

const port = Number(process.env.PORT ?? 4300);
const projects = new ProjectRepository(database);
const renderJobs = new RenderJobRepository(database);
const probe = new ProbeService();
const app = createApp({
  projects,
  renderJobs,
  media: new MediaService(probe),
  preparation: new RenderPreparationService(
    projects,
    renderJobs,
    new AudioCppService(),
    probe,
  ),
});

app.listen(port, () => {
  console.log(JSON.stringify({ event: "server.started", port }));
});
