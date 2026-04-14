import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Notification } from '@/types/asset';

export function useNotifications(unreadOnly: boolean = false, refetchIntervalMs: number | false = 30_000) {
    return useQuery({
        queryKey: ['notifications', unreadOnly],
        queryFn: async () => {
            const { data } = await api.get<Notification[]>('/api/notifications', {
                params: { unreadOnly },
            });
            return data;
        },
        staleTime: 0,
        refetchInterval: refetchIntervalMs === false ? false : refetchIntervalMs,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

export function useUnreadCount(refetchIntervalMs: number | false = 30_000) {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const { data } = await api.get<{ count: number }>('/api/notifications/unread-count');
            return data.count;
        },
        staleTime: 0,
        refetchInterval: refetchIntervalMs === false ? false : refetchIntervalMs,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

export function useMarkAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.put(`/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await api.put('/api/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useDeleteNotification() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/notifications/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}
