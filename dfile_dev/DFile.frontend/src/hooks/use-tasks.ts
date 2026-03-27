import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '@/types/task';
import { toast } from 'sonner';

interface CreateTaskPayload {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    assignedTo?: string;
    dueDate?: string;
}

interface UpdateTaskPayload extends CreateTaskPayload {
    isArchived?: boolean;
}

export function useTasks(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['tasks', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Task[]>('/api/tasks', {
                params: { showArchived }
            });
            return data;
        },
    });
}

export function useAddTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: CreateTaskPayload) => {
            const { data } = await api.post<Task>('/api/tasks', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully');
        },
        onError: () => {
            toast.error('Failed to create task');
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateTaskPayload }) => {
            const { data } = await api.put<Task>(`/api/tasks/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task updated successfully');
        },
        onError: () => {
            toast.error('Failed to update task');
        },
    });
}

export function useArchiveTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/tasks/archive/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task archived');
        },
        onError: () => {
            toast.error('Failed to archive task');
        },
    });
}

export function useRestoreTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.put(`/api/tasks/restore/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task restored');
        },
        onError: () => {
            toast.error('Failed to restore task');
        },
    });
}
