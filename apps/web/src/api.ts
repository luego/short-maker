// Shared HTTP handling for the local API. Uploads keep their browser-generated headers.
export async function apiRequest<T>(
  url: string,
  fallbackMessage: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? fallbackMessage);
  }
  if (body === null) throw new Error(fallbackMessage);
  return body as T;
}

export type Project = {
  id: string;
  name: string;
  templateId: string;
  sourceFilename?: string | null;
  sourceDuration?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  sourceFps?: number | null;
  sourceUrl?: string;
};

export function withSourceUrl(project: Project): Project {
  return {
    ...project,
    sourceUrl: project.sourceFilename
      ? `/api/projects/${project.id}/source-video`
      : undefined,
  };
}
