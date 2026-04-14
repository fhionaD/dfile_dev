
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Category, CreateCategoryPayload } from '@/types/asset';
import api from '@/lib/api';
import { parseApiError } from '@/lib/api-errors';
import { toast } from 'sonner';

export function useCategories(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['categories', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Category[]>('/api/AssetCategories', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useCategory(id: string) {
    return useQuery({
        queryKey: ['categories', id],
        queryFn: async () => {
            const { data } = await api.get<Category>(`/api/AssetCategories/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useAddCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateCategoryPayload) => {
            const { data } = await api.post<Category>('/api/AssetCategories', {
                ...payload,
                categoryName: payload.categoryName.trim(),
                description: (payload.description ?? '').trim(),
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: unknown) => {
            const axiosErr = error as AxiosError<{ message?: string }>;
            const status = axiosErr.response?.status;
            const rawMsg = axiosErr.response?.data?.message;
            if (status === 400 && typeof rawMsg === "string" && rawMsg.trim()) {
                toast.error(rawMsg);
                return;
            }
            const backendMessage = String(rawMsg ?? "").toLowerCase();
            const isDuplicate = status === 409 || backendMessage.includes("exist") || backendMessage.includes("duplicate");
            if (isDuplicate) {
                // Silently handle duplicate category conflict
                throw error;
            } else {
                toast.error(parseApiError(error, "Failed to add category"));
            }
        }
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: CreateCategoryPayload }) => {
            const { data } = await api.put<Category>(`/api/AssetCategories/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
        onError: () => {
            toast.error('Failed to update category');
        }
    });
}

export function useArchiveCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/AssetCategories/archive/${id}`, undefined, { suppressGlobalError: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category archived successfully');
        },
        onError: (error: unknown) => {
            const axiosErr = error as AxiosError<{ message?: string }>;
            if (axiosErr.response?.status === 400) {
                const msg = String(axiosErr.response.data?.message ?? '');
                toast.error(msg || 'Cannot archive category with registered assets.');
                return;
            }
            toast.error(parseApiError(error, 'Something went wrong. Please try again.'));
        }
    });
}

export function useRestoreCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/AssetCategories/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category restored');
        },
        onError: () => {
            toast.error('Failed to restore category');
        }
    });
}
