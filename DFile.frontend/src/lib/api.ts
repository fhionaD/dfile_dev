
import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api-base-url';

// Create a centralized Axios instance
const baseURL = getApiBaseUrl();

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

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
export const getErrorMessage = (error: any, fallback?: string) => error?.response?.data?.message || error?.message || fallback || 'An error occurred';
