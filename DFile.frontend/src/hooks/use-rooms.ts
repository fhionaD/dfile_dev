import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Room, RoomCategory } from '@/types/asset';
import { toast } from 'sonner';

// In-memory store for session
let MOCK_ROOMS: Room[] = [
    { id: "R-101", unitId: "U-1", categoryId: "RC-01", floor: "1", maxOccupancy: 4, status: "Occupied" },
    { id: "Conf Room A", unitId: "U-2", categoryId: "RC-02", floor: "2", maxOccupancy: 12, status: "Available" },
    { id: "Basement", unitId: "U-0", categoryId: "RC-03", floor: "B", maxOccupancy: 2, status: "Maintenance" }
];

let MOCK_ROOM_CATEGORIES: RoomCategory[] = [
    { id: "RC-01", name: "Office", description: "Standard Office", baseRate: 100, status: "Active" },
    { id: "RC-02", name: "Conference", description: "Meeting Room", baseRate: 200, status: "Active" },
    { id: "RC-03", name: "Utility", description: "Storage/Utility", baseRate: 50, status: "Active" }
];

export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_ROOMS];
        },
    });
}

export function useRoomCategories() {
    return useQuery({
        queryKey: ['room-categories'],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_ROOM_CATEGORIES];
        },
    });
}

export function useAddRoom() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (room: Room) => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newRoom = { ...room, id: `R-MOCK-${Date.now()}` };
            MOCK_ROOMS.push(newRoom);
            return newRoom;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room added successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            MOCK_ROOMS = MOCK_ROOMS.map(r => r.id === room.id ? room : r);
            return room;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room updated successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            MOCK_ROOMS = MOCK_ROOMS.filter(r => r.id !== roomId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toast.success('Room archived (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newCat = { ...category, id: `RC-MOCK-${Date.now()}` } as RoomCategory;
            MOCK_ROOM_CATEGORIES.push(newCat);
            return newCat;
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
