
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api-base-url';
import { toast } from 'sonner';
import { emitGlobalError } from '@/lib/global-error-bus';

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
        const token = typeof window !== 'undefined' ? localStorage.getItem('dfile_token') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
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
