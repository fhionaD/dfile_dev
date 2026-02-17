
import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',  // Use empty string as default production fallback (relative path)
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
            // You could dispatch a logout event here if you wanted strict sessions
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default api;
