import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '@/types/task';
import { toast } from 'sonner';

export function useTasks(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['tasks', showArchived],
        queryFn: async () => {
            const { data } = await api.get<Task[]>(`/api/tasks?showArchived=${showArchived}`);
            return data;
        },
    });
}

export function useAddTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Task) => {
            const { data } = await api.post<Task>('/api/tasks', task);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully');
        },
        onError: (error) => {
            console.error('Failed to create task:', error);
            toast.error('Failed to create task');
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Task) => {
            const { data } = await api.put<Task>(`/api/tasks/${task.id}`, task);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task updated successfully');
        },
        onError: (error) => {
            console.error('Failed to update task:', error);
            toast.error('Failed to update task');
        },
    });
}

export function useArchiveTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            await api.delete(`/api/tasks/${taskId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task archived');
        },
        onError: (error) => {
            console.error('Failed to archive task:', error);
            toast.error('Failed to archive task');
        },
    });
}

export function useRestoreTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (taskId: string) => {
            await api.put(`/api/tasks/restore/${taskId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task restored');
        },
        onError: (error) => {
            console.error('Failed to restore task:', error);
            toast.error('Failed to restore task');
        },
    });
}
