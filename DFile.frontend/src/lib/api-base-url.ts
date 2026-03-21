const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/** Default API port when running `dotnet run` (see launchSettings.json). */
const LOCAL_API_ORIGIN = "http://localhost:5090";

/**
 * Returns the base URL for the Axios instance.
 * Call this when building each request (browser) so dev fallback applies after `window` exists.
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

  if (configured) {
    configured = trimTrailingSlash(configured);
    if (configured.toLowerCase().endsWith("/api")) {
      console.warn(
        `[API Config] NEXT_PUBLIC_API_URL should NOT end with "/api". ` +
          `Stripping it to prevent /api/api/ routing errors. Set it to the host root only (e.g. "https://myhost.com").`
      );
      configured = configured.slice(0, -4);
    }
    return configured;
  }

  // next dev (localhost:3000 etc.): without NEXT_PUBLIC_API_URL, relative /api/* hits the
  // Next server, not Kestrel — rewrites are not applied to static export and can be flaky.
  // Point at the API explicitly in development only. Production export keeps "" for same-origin.
  if (
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined"
  ) {
    const { hostname, port } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";
    const devPorts = new Set(["3000", "3001", "3002"]);
    if (isLocal && devPorts.has(port)) {
      return LOCAL_API_ORIGIN;
    }
  }

  return "";
};

