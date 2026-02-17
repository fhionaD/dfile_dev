
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Category } from '@/types/asset';
import { toast } from 'sonner';

// Mock Data
const MOCK_CATEGORIES: Category[] = [
    { id: "ac_1", name: "Electronics", description: "TVs, Smart Home", type: "Moveable", items: 12, status: "Active" },
    { id: "ac_2", name: "Furniture", description: "Sofas, Tables, Chairs", type: "Fixed", items: 45, status: "Active" },
    { id: "ac_3", name: "Maintenance", description: "Tools, Paint", type: "Soft", items: 8, status: "Active" },
];

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return MOCK_CATEGORIES;
        },
    });
}

export function useAddCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Omit<Category, 'id'>) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            return { ...category, id: `ac_${Date.now()}` };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category added');
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Category) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            return category;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
    });
}

export function useArchiveCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category archived');
        },
    });
}
