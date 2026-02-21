const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getApiBaseUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

  // Empty means "same-origin" (e.g. backend serves frontend and API from one host)
  if (!configured) return "";

  return trimTrailingSlash(configured);
};

export const buildApiUrl = (path: string): string => {
  const apiBase = getApiBaseUrl();

  if (apiBase) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${apiBase}${normalizedPath}`;
  }

  // If apiBase is empty, return path as-is to allow relative paths
  return path;
};

