const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/** Default API port when running `dotnet run` (see launchSettings.json). */
const LOCAL_API_ORIGIN = "http://localhost:5090";

/**
 * Normalize localhost-style origins so `http://127.0.0.1:5090` matches `http://localhost:5090`,
 * and default ports match the way browsers report `location.origin` (usually no `:80` / `:443`).
 */
function normalizeLocalOrigin(origin: string): string {
  try {
    const u = new URL(origin);
    const host =
      u.hostname === "127.0.0.1" || u.hostname === "[::1]"
        ? "localhost"
        : u.hostname;
    const defaultPort = u.protocol === "https:" ? "443" : "80";
    const effectivePort = u.port || defaultPort;
    const omitPort =
      (u.protocol === "http:" && effectivePort === "80") ||
      (u.protocol === "https:" && effectivePort === "443");
    const authority = omitPort ? host : `${host}:${effectivePort}`;
    return `${u.protocol}//${authority}`.toLowerCase();
  } catch {
    return origin.toLowerCase();
  }
}

/** `npm run dev` on a local Next port — use relative `/api/*` so next.config rewrites proxy to Kestrel. */
function shouldUseNextDevApiProxy(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "development") return false;
  const { hostname, port } = window.location;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";
  return isLocal && new Set(["3000", "3001", "3002"]).has(port);
}

function isDefaultLocalBackendOrigin(configured: string): boolean {
  try {
    return normalizeLocalOrigin(configured) === normalizeLocalOrigin(LOCAL_API_ORIGIN);
  } catch {
    return false;
  }
}

/**
 * Returns the base URL for the Axios instance.
 * Call this when building each request (browser) so dev fallback applies after `window` exists.
 *
 * IMPORTANT: Do NOT set NEXT_PUBLIC_API_URL to a value ending with "/api".
 * Example CORRECT values:
 *   - "" (empty) → same-origin, backend and frontend on same host (recommended when UI is served by Kestrel/wwwroot)
 *   - "http://localhost:5090" → in `npm run dev` on :3000, treated like local API and proxied via Next rewrites (same as empty)
 *   - "https://myapp.example.com" → production host (no trailing /api)
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

    if (typeof window !== "undefined") {
      const page = normalizeLocalOrigin(window.location.origin);
      const api = normalizeLocalOrigin(configured);
      if (page === api) return "";
      // Dev on :3000: never call :5090 from the browser; Next rewrites /api → Kestrel (see next.config.ts).
      if (shouldUseNextDevApiProxy() && isDefaultLocalBackendOrigin(configured)) return "";
    }

    return configured;
  }

  if (shouldUseNextDevApiProxy()) return "";

  return "";
};
