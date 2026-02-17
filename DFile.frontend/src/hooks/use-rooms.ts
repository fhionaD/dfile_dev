import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Room, RoomCategory } from '@/types/asset';
import { toast } from 'sonner';

export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            const { data } = await api.get<Room[]>('/api/rooms');
            return data;
        },
    });
}

export function useRoomCategories() {
    return useQuery({
        queryKey: ['room-categories'],
        queryFn: async () => {
            const { data } = await api.get<RoomCategory[]>('/api/room-categories');
            return data;
        },
    });
}

export function useAddRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: Room) => {
            // Ensure ID is generated if not present, though usually backend handles it.
            // For now passing the whole object as per existing pattern
            const { data } = await api.post<Room>('/api/rooms', room);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room added successfully');
        },
        onError: (error) => {
            console.error('Failed to add room:', error);
            toast.error('Failed to add room');
        },
    });
}

export function useUpdateRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: Room) => {
            const { data } = await api.put<Room>(`/api/rooms/${room.id}`, room);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room updated successfully');
        },
        onError: (error) => {
            console.error('Failed to update room:', error);
            toast.error('Failed to update room');
        },
    });
}

export function useArchiveRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (roomId: string) => {
            await api.delete(`/api/rooms/${roomId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room archived');
        },
        onError: (error) => {
            console.error('Failed to archive room:', error);
            toast.error('Failed to archive room');
        },
    });
}

export function useAddRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Omit<RoomCategory, 'id'>) => {
            const { data } = await api.post<RoomCategory>('/api/room-categories', category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category added');
        },
        onError: (error) => {
            console.error('Failed to add room category:', error);
            toast.error('Failed to add room category');
        },
    });
}

export function useUpdateRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: RoomCategory) => {
            const { data } = await api.put<RoomCategory>(`/api/room-categories/${category.id}`, category);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category updated');
        },
        onError: (error) => {
            console.error('Failed to update room category:', error);
            toast.error('Failed to update room category');
        },
    });
}

export function useArchiveRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (categoryId: string) => {
            await api.delete(`/api/room-categories/${categoryId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category archived');
        },
        onError: (error) => {
            console.error('Failed to archive room category:', error);
            toast.error('Failed to archive room category');
        },
    });
}
