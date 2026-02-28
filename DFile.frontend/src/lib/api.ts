
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api-base-url';

// Create a centralized Axios instance
const baseURL = getApiBaseUrl();
console.log('API Base URL:', baseURL || "Using relative path (backend and frontend on same origin)");

const api = axios.create({
    baseURL: baseURL, // Empty string means relative paths (same origin)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
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

// Response Interceptor: Handle Global Errors (like 401)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Optional: Handle 401 Unauthorized globally (e.g., redirect to login)
        // For now, we just pass it through so components can handle it or queries can retry
        if (error.response?.status === 401) {
            // Skip interceptor handling for /api/auth/me — initAuth already
            // handles 401 gracefully (calls logout). Logging here would be
            // redundant and confusing in the console.
            const requestUrl = error.config?.url || '';
            if (requestUrl.includes('/api/auth/me')) {
                // Return a special rejected promise that listeners can ignore if they want, 
                // but we suppress the loud console error here in the interceptor.
                return Promise.reject(error);
            }

            console.error('[API 401 UNAUTHORIZED]', {
                url: error.config?.url,
                method: error.config?.method,
                data: error.response?.data,
                headers: error.config?.headers
            });
            // Clear stale session and notify auth context via custom event.
            // Do NOT use window.location.href — it causes a full reload that
            // races with React router and triggers Chrome's navigation throttle.
            if (typeof window !== 'undefined') {
                localStorage.removeItem('dfile_token');
                localStorage.removeItem('dfile_user');
                localStorage.removeItem('dfile_tenant');
                window.dispatchEvent(new Event('auth:session-expired'));
            }
        }
        if (error.response?.status === 403) {
            console.error('[API 403 DETAIL]', error.response.data);
        }
        return Promise.reject(error);
    }
);

export default api;
