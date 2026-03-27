
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category, CreateCategoryPayload } from '@/types/asset';
import api from '@/lib/api';
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
            const { data } = await api.post<Category>('/api/AssetCategories', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category added');
        },
        onError: (error: any) => {
            const status = error?.response?.status;
            const backendMessage = String(error?.response?.data?.message ?? "").toLowerCase();
            const isDuplicate = status === 409 || backendMessage.includes("exist") || backendMessage.includes("duplicate");
            toast.error(isDuplicate ? 'Category Name already existed. Check again' : 'Failed to add category');
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
            await api.put(`/api/AssetCategories/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category archived');
        },
        onError: () => {
            toast.error('Failed to archive category');
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
