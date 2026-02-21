
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category } from '@/types/asset';
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
        mutationFn: async (category: Omit<Category, 'id' | 'items'>) => {
            // Note: Backend generates ID. Frontend usually sends DTO without ID or empty ID.
            // Our Category type has ID. We use Omit.
            const { data } = await api.post<Category>('/api/AssetCategories', category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category added');
        },
        onError: (error) => {
            console.error('Failed to add category:', error);
            toast.error('Failed to add category');
        }
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Category) => {
            const { data } = await api.put<Category>(`/api/AssetCategories/${category.id}`, category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
        onError: (error: any) => {
            console.error('Failed to update category:', error);
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
        onError: (error: any) => {
            console.error('Failed to archive category:', error);
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
        onError: (error: any) => {
            console.error('Failed to restore category:', error);
            toast.error('Failed to restore category');
        }
    });
}
