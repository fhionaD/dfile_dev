
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '@/lib/api-base-url';

declare module 'axios' {
    export interface AxiosRequestConfig {
        skipAuthHeader?: boolean;
        /** When true the global response-error interceptor will not emit toasts / banners. */
        suppressGlobalError?: boolean;
    }
}
import { toast } from 'sonner';
import { emitGlobalError } from '@/lib/global-error-bus';

function clearAuthorizationHeader(config: InternalAxiosRequestConfig) {
    const h = config.headers;
    if (!h) return;
    if (typeof (h as { delete?: (name: string) => void }).delete === 'function') {
        (h as { delete: (name: string) => void }).delete('Authorization');
        (h as { delete: (name: string) => void }).delete('authorization');
    } else {
        delete (h as Record<string, unknown>).Authorization;
        delete (h as Record<string, unknown>).authorization;
    }
}

// baseURL is resolved per request so dev fallback (localhost:3000 → API :5090) runs after window exists.
const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: base URL + token
api.interceptors.request.use(
    (config) => {
        config.baseURL = getApiBaseUrl();
        const path = (config.url ?? '').toLowerCase();
        const isLogin = config.skipAuthHeader === true || path.includes('auth/login');
        const token = typeof window !== 'undefined' ? localStorage.getItem('dfile_token') : null;
        if (token !== null && token !== '' && !isLogin) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            clearAuthorizationHeader(config);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/** Throttle "backend unreachable" banners — many hooks fire at once and would spam the UI. */
let lastBackendUnreachableEmit = 0;
const BACKEND_UNREACHABLE_THROTTLE_MS = 45_000;

function isAxiosNetworkError(error: unknown): boolean {
    const e = error as { response?: unknown; request?: unknown; message?: string };
    // No HTTP response but a request was sent (browser) / connection refused / ECONNREFUSED
    if (e?.response) return false;
    if (!e?.request && !e?.message) return false;
    const msg = (e.message || '').toLowerCase();
    if (msg.includes('network error') || msg.includes('err_connection_refused') || msg.includes('econnrefused')) {
        return true;
    }
    // Axios: failed to get response (typical when API is down)
    return !!e.request && !e.response;
}

/**
 * Skip the top global error banner when the caller already surfaces the error (toast / inline).
 * Covers `suppressGlobalError` plus PATCH archive/restore on room entities — `use-rooms` mutations use Sonner toasts.
 */
function shouldSkipGlobalErrorBanner(error: unknown): boolean {
    const cfg = (error as { config?: { suppressGlobalError?: boolean; url?: string; method?: string } })?.config;
    if (!cfg) return false;
    if (cfg.suppressGlobalError === true) return true;
    const method = (cfg.method || 'get').toLowerCase();
    if (method !== 'patch') return false;
    const path = (cfg.url || '').split('?')[0].toLowerCase();
    return (
        /\/api\/roomcategories\/[^/]+\/(archive|restore)$/.test(path) ||
        /\/api\/roomsubcategories\/[^/]+\/(archive|restore)$/.test(path) ||
        /\/api\/rooms\/[^/]+\/(archive|restore)$/.test(path)
    );
}

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (shouldSkipGlobalErrorBanner(error)) {
            return Promise.reject(error);
        }

        const status = error?.response?.status;
        const message = error?.response?.data?.message;
        if (status === 409 && typeof message === 'string' && message.includes('Duplicate request detected')) {
            toast.error('Duplicate action blocked. Please wait a moment before trying again.');
            emitGlobalError({
                title: 'Duplicate Request',
                message: 'Duplicate action blocked. Please wait a moment before trying again.',
                level: 'warning',
            });
            return Promise.reject(error);
        }

        // Backend not running / no TCP listener — avoid one banner per parallel request
        if (isAxiosNetworkError(error)) {
            const now = Date.now();
            if (now - lastBackendUnreachableEmit >= BACKEND_UNREACHABLE_THROTTLE_MS) {
                lastBackendUnreachableEmit = now;
                const hint =
                    (getApiBaseUrl() || '(same origin)') +
                    ' — start the API from the repo: cd DFile.backend then dotnet run';
                emitGlobalError({
                    title: 'Cannot reach API (is the backend running?)',
                    message: `Connection refused or network error. ${hint}`,
                    level: 'warning',
                });
                toast.warning('Backend not reachable — start dotnet run in DFile.backend', { duration: 8000 });
            }
            return Promise.reject(error);
        }

        const path = error?.config?.url || 'API request';
        const fallbackMessage = `Request failed (${status || 'network error'})`;
        const errorMessage =
            (typeof message === 'string' && message) ||
            error?.message ||
            fallbackMessage;

        emitGlobalError({
            title: `Request Error: ${path}`,
            message: errorMessage,
            level: 'error',
        });

        return Promise.reject(error);
    }
);

export default api;
export { parseApiError, getErrorMessage } from "@/lib/api-errors";
