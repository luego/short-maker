import { app } from "./app.js";

const port = Number(process.env.PORT ?? 4300);
app.listen(port, () => {
  console.log(JSON.stringify({ event: "server.started", port }));
});
