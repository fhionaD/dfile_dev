import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Room, RoomCategory } from '@/types/asset';
import { toast } from 'sonner';

export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
            const { data } = await api.get<Room[]>('/api/Rooms');
            return data;
        },
    });
}

export function useRoomCategories() {
    return useQuery({
        queryKey: ['room-categories', 'all'],
        queryFn: async () => {
            // Fetch all categories including archived ones so management modal works correctly
            const { data } = await api.get<RoomCategory[]>('/api/RoomCategories?includeArchived=true');
            return data;
        },
    });
}

export function useAddRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: Partial<Room>) => {
            const { data } = await api.post<Room>('/api/Rooms', room);
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
            const { data } = await api.put<Room>(`/api/Rooms/${room.id}`, room);
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
        mutationFn: async (room: Room) => {
            const updatedRoom = { 
                ...room, 
                archived: !room.archived, 
                status: !room.archived ? "Deactivated" : "Available" 
            };
            const { data } = await api.put<Room>(`/api/Rooms/${room.id}`, updatedRoom);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room archive status updated');
        },
        onError: (error) => {
            console.error('Failed to update room archive status:', error);
            toast.error('Failed to update room archive status');
        },
    });
}

export function useAddRoomCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Partial<RoomCategory>) => {
            const { data } = await api.post<RoomCategory>('/api/RoomCategories', category);
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
            const { data } = await api.put<RoomCategory>(`/api/RoomCategories/${category.id}`, category);
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
        mutationFn: async (category: RoomCategory) => {
             const updatedCategory = { 
                ...category, 
                archived: !category.archived, 
                status: !category.archived ? "Archived" : "Active" 
            };
            const { data } = await api.put<RoomCategory>(`/api/RoomCategories/${category.id}`, updatedCategory);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['room-categories'] });
            toast.success('Room category archive status updated');
        },
        onError: (error) => {
            console.error('Failed to update room category archive status:', error);
            toast.error('Failed to update room category archive status');
        },
    });
}
