import { AxiosError } from "axios";

const DEFAULT_FALLBACK = "An error occurred";

type ApiErrorBody = {
    message?: string;
    errors?: Record<string, string[]>;
};

/**
 * Extracts a user-facing message from Axios/network errors, including ASP.NET model-state `errors`.
 */
export function parseApiError(error: unknown, fallback?: string): string {
    const fb = fallback ?? DEFAULT_FALLBACK;
    if (error == null || typeof error !== "object") {
        return fb;
    }

    const axiosErr = error as AxiosError<ApiErrorBody>;
    const msg = axiosErr.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) {
        return msg;
    }

    const validation = axiosErr.response?.data?.errors;
    if (validation && typeof validation === "object") {
        const firstField = Object.keys(validation)[0];
        const firstIssue = firstField ? validation[firstField]?.[0] : undefined;
        if (firstIssue) {
            return firstIssue;
        }
    }

    const axiosMessage = axiosErr.message;
    if (typeof axiosMessage === "string" && axiosMessage.trim()) {
        return axiosMessage;
    }

    return fb;
}

/** @deprecated Prefer `parseApiError` — alias kept for existing imports from `@/lib/api`. */
export function getErrorMessage(error: unknown, fallback?: string): string {
    return parseApiError(error, fallback);
}
