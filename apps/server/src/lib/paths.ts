import path from "node:path";

// import.meta.dirname reemplaza a path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(import.meta.dirname, "../..");
const mediaRoot = path.join(projectRoot, "media");

export { projectRoot, mediaRoot };
