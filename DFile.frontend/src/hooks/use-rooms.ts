import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Room, RoomCategory, RoomSubCategory } from '@/types/asset';
import { toast } from 'sonner';
import axios from 'axios';

type PairCounts = { active: number; archived: number };

// ── Room hooks ───────────────────────────────────────────────

export function useRooms(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['rooms', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Room[]>('/api/rooms', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useAddRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: { unitId: string; name: string; floor: string; categoryId?: string; subCategoryId?: string; status?: string; maxOccupancy?: number }) => {
            const { data } = await api.post<Room>('/api/rooms', room);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room added successfully');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'This room already exists.');
            } else {
                toast.error('Failed to add room');
            }
        },
    });
}

export function useUpdateRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { unitId: string; name: string; floor: string; categoryId?: string; subCategoryId?: string; status?: string; maxOccupancy?: number; archived?: boolean } }) => {
            const { data } = await api.put<Room>(`/api/rooms/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room updated successfully');
        },
        onError: () => {
            toast.error('Failed to update room');
        },
    });
}

export function useArchiveRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/rooms/${id}/archive`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room archived');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'Failed to archive room.');
            } else {
                toast.error('Failed to archive room');
            }
        },
    });
}

export function useRestoreRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/rooms/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room restored');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'Failed to restore room.');
            } else {
                toast.error('Failed to restore room');
            }
        },
    });
}

// ── Room Category hooks ──────────────────────────────────────

export function useRoomCategoryCounts() {
    return useQuery({
        queryKey: ['room-category-counts'],
        queryFn: async () => {
            const { data } = await api.get<PairCounts>('/api/roomcategories/counts');
            return data;
        },
        staleTime: 30_000,
    });
}

export function useRoomCategories(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['room-categories', showArchived],
        queryFn: async () => {
            const { data } = await api.get<RoomCategory[]>('/api/roomcategories', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useAddRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { name: string; description: string }) => {
            const { data } = await api.post<RoomCategory>('/api/roomcategories', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            queryClient.invalidateQueries({ queryKey: ['room-category-counts'] });
            toast.success('Room category added');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'This category already exists.');
            } else {
                toast.error('Failed to add room category');
            }
        },
    });
}

export function useUpdateRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { name: string; description: string; rowVersion?: string } }) => {
            const { data } = await api.put<RoomCategory>(`/api/roomcategories/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            queryClient.invalidateQueries({ queryKey: ['room-category-counts'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room category updated');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'This category already exists.');
            } else {
                toast.error('Failed to update room category');
            }
        },
    });
}

type ArchiveRoomCategoryResponse = {
    message?: string;
    cascadedRoomCount?: number;
    cascadedSubCategoryCount?: number;
};

export function useArchiveRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.patch<ArchiveRoomCategoryResponse>(
                `/api/roomcategories/${id}/archive`,
                undefined,
                { suppressGlobalError: true },
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            queryClient.invalidateQueries({ queryKey: ['room-category-counts'] });
            queryClient.invalidateQueries({ queryKey: ['room-subcategories'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            const n = data?.cascadedRoomCount ?? 0;
            const s = data?.cascadedSubCategoryCount ?? 0;
            const parts: string[] = [];
            if (n > 0) parts.push(`${n} room unit${n !== 1 ? 's' : ''}`);
            if (s > 0) parts.push(`${s} sub-categor${s !== 1 ? 'ies' : 'y'}`);
            const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : '';
            toast.success((data?.message ?? 'Room category archived') + suffix);
        },
        onError: (error) => {
            const archiveConflictDescription =
                'This room category is currently assigned to one or more room units. Please update or remove those room units before archiving this category.';

            if (!axios.isAxiosError(error) || !error.response) {
                toast.error('Unable to archive this category', { description: 'Please try again.' });
                return;
            }

            const { status, data } = error.response;
            const payload =
                typeof data === 'object' && data !== null
                    ? (data as { title?: string; message?: string })
                    : {};

            if (status === 409) {
                toast.error('⚠️ Unable to Archive Category', {
                    description: payload.message || archiveConflictDescription,
                });
                return;
            }

            if (status === 404) {
                toast.error('Category not found', {
                    description: payload.message || 'This room category could not be found.',
                });
                return;
            }

            if (status === 500) {
                toast.error('Unable to archive this category', {
                    description:
                        payload.message ||
                        'An unexpected error occurred while archiving. Please try again or contact support.',
                });
                return;
            }

            toast.error('Unable to archive this category', { description: 'Please try again.' });
        },
    });
}

export function useRestoreRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/roomcategories/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            queryClient.invalidateQueries({ queryKey: ['room-category-counts'] });
            toast.success('Room category restored');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'Failed to restore room category.');
            } else {
                toast.error('Failed to restore room category');
            }
        },
    });
}

// ── Room SubCategory hooks ───────────────────────────────────

export function useRoomSubCategories(roomCategoryId?: string, showArchived: boolean = false) {
    return useQuery({
        queryKey: ['room-subcategories', roomCategoryId, showArchived],
        queryFn: async () => {
            const params: Record<string, string | boolean> = { showArchived };
            if (roomCategoryId) params.roomCategoryId = roomCategoryId;
            const { data } = await api.get<RoomSubCategory[]>('/api/roomsubcategories', { params });
            return data;
        },
    });
}

export function useAddRoomSubCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { name: string; description: string; roomCategoryId: string }) => {
            const { data } = await api.post<RoomSubCategory>('/api/roomsubcategories', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-subcategories'] });
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Sub-category added');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'This sub-category already exists.');
            } else {
                toast.error('Failed to add sub-category');
            }
        },
    });
}

export function useUpdateRoomSubCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { name: string; description: string; rowVersion?: string } }) => {
            const { data } = await api.put<RoomSubCategory>(`/api/roomsubcategories/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-subcategories'] });
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Sub-category updated');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'This sub-category already exists.');
            } else {
                toast.error('Failed to update sub-category');
            }
        },
    });
}

export function useArchiveRoomSubCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/roomsubcategories/${id}/archive`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-subcategories'] });
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Sub-category archived');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'Failed to archive sub-category.');
            } else {
                toast.error('Failed to archive sub-category');
            }
        },
    });
}

export function useRestoreRoomSubCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/api/roomsubcategories/${id}/restore`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-subcategories'] });
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Sub-category restored');
        },
        onError: (error) => {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast.error(error.response.data?.message || 'Failed to restore sub-category.');
            } else {
                toast.error('Failed to restore sub-category');
            }
        },
    });
}
