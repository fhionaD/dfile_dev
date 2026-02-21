const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/**
 * Returns the base URL for the Axios instance.
 * 
 * IMPORTANT: Do NOT set NEXT_PUBLIC_API_URL to a value ending with "/api".
 * Example CORRECT values:
 *   - "" (empty) → same-origin, backend and frontend on same host
 *   - "http://localhost:5090" → local backend
 *   - "https://myapp.monsterasp.net" → production host (no trailing /api)
 * 
 * If a "/api" suffix is accidentally included, it is stripped automatically.
 */
export const getApiBaseUrl = (): string => {
  let configured = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

  // Empty means "same-origin" (e.g. backend serves frontend and API from one host)
  if (!configured) return "";

  // Guard: strip trailing /api to prevent /api/api/ double-path bug.
  // All API call paths already include /api/... so the base should be the host only.
  configured = trimTrailingSlash(configured);
  if (configured.toLowerCase().endsWith("/api")) {
    console.warn(
      `[API Config] NEXT_PUBLIC_API_URL should NOT end with "/api". ` +
      `Stripping it to prevent /api/api/ routing errors. Set it to the host root only (e.g. "https://myhost.com").`
    );
    configured = configured.slice(0, -4); // remove trailing "/api"
  }

  return configured;
};

