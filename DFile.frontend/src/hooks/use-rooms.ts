import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Room, RoomCategory } from '@/types/asset';
import { toast } from 'sonner';

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

export function useRoomCategories() {
    return useQuery({
        queryKey: ['room-categories', 'all'],
        queryFn: async () => {
            const { data } = await api.get<RoomCategory[]>('/api/roomcategories?includeArchived=true');
            return data;
        },
    });
}

export function useAddRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: { unitId: string; name: string; floor: string; categoryId?: string; status?: string; maxOccupancy?: number }) => {
            const { data } = await api.post<Room>('/api/rooms', room);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room added successfully');
        },
        onError: () => {
            toast.error('Failed to add room');
        },
    });
}

export function useUpdateRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { unitId: string; name: string; floor: string; categoryId?: string; status?: string; maxOccupancy?: number; archived?: boolean } }) => {
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
            await api.put(`/api/rooms/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room archived');
        },
        onError: () => {
            toast.error('Failed to archive room');
        },
    });
}

export function useRestoreRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/rooms/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room restored');
        },
        onError: () => {
            toast.error('Failed to restore room');
        },
    });
}

export function useAddRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { name: string; subCategory: string; description: string; baseRate: number; maxOccupancy: number }) => {
            const { data } = await api.post<RoomCategory>('/api/roomcategories', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category added');
        },
        onError: () => {
            toast.error('Failed to add room category');
        },
    });
}

export function useUpdateRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: { name: string; subCategory: string; description: string; baseRate: number; maxOccupancy: number; archived?: boolean; status?: string } }) => {
            const { data } = await api.put<RoomCategory>(`/api/roomcategories/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category updated');
        },
        onError: () => {
            toast.error('Failed to update room category');
        },
    });
}

export function useArchiveRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/roomcategories/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category archived');
        },
        onError: () => {
            toast.error('Failed to archive room category');
        },
    });
}

export function useRestoreRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/roomcategories/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category restored');
        },
        onError: () => {
            toast.error('Failed to restore room category');
        },
    });
}
