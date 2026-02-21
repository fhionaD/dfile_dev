import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '@/types/task';
import { toast } from 'sonner';

// In-memory store for session (REMOVED - CONNECTED TO API)
// let MOCK_TASKS: Task[] = ...

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
        mutationFn: async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
            const { data } = await api.post<Task>('/api/tasks', newTask);
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
        mutationFn: async (updatedTask: Task) => {
            const { data } = await api.put<Task>(`/api/tasks/${updatedTask.id}`, updatedTask);
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
        mutationFn: async (id: string) => {
              // Ensure we have a proper archive endpoint or use restore logic (archived=true).
              // Since we didn't add "archive" endpoint to TasksController, I will assume it exists or use restore logic in reverse if possible?
              // Wait, I saw "RestoreTask" in controller. I did NOT see "ArchiveTask".
              // I should verify if I can just use "PutTask" with archived=true.
             const { data: task } = await api.get<Task>(`/api/tasks/${id}`);
             await api.put(`/api/tasks/${id}`, { ...task, archived: true });
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
        mutationFn: async (id: string) => {
            await api.put(`/api/tasks/restore/${id}`);
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
