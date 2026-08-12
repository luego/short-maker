import path from "node:path";
import { fileURLToPath } from "node:url";

const serverSourceDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const projectRoot = path.resolve(serverSourceDirectory, "../../../..");
export const mediaRoot = path.join(projectRoot, "media");
