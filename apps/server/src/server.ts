import { createApp } from "./app.js";
import { database } from "./db/client.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { RenderJobRepository } from "./repositories/render-job.repository.js";
import { MediaService } from "./services/media.service.js";
import { ProbeService } from "./services/probe.service.js";

const port = Number(process.env.PORT ?? 4300);
const app = createApp({
  projects: new ProjectRepository(database),
  renderJobs: new RenderJobRepository(database),
  media: new MediaService(new ProbeService()),
});

app.listen(port, () => {
  console.log(JSON.stringify({ event: "server.started", port }));
});
