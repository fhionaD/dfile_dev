import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Task } from '@/types/task';
import { toast } from 'sonner';

// In-memory store for session
let MOCK_TASKS: Task[] = [
    {
        id: "T-001",
        title: "Review Monthly Safety Checklist",
        description: "Conduct a full safety audit of the warehouse floor.",
        priority: "High",
        status: "Pending", 
        assignedTo: "John Doe",
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString()
    },
    {
        id: "T-002",
        title: "Update Asset Inventory",
        description: "Check for new assets and tag them accordingly.",
        priority: "Medium",
        status: "In Progress",
        assignedTo: "Jane Smith",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString()
    },
        {
        id: "T-003",
        title: "Purchase Office Supplies",
        description: "Restock printer paper and ink cartridges.",
        priority: "Low",
        status: "Completed",
        assignedTo: "Bob Johnson",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        dueDate: new Date(Date.now() - 86400000).toISOString()
    }
];

export function useTasks(showArchived: boolean = false) {
    return useQuery({
        queryKey: ['tasks', showArchived],
        queryFn: async () => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            return [...MOCK_TASKS].filter(t => showArchived ? true : !t.archived);
        },
    });
}

export function useAddTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Task) => {
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            const newTask = { ...task, id: `T-MOCK-${Date.now()}` };
            MOCK_TASKS.push(newTask);
            return newTask;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task created successfully (Mock)');
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
             // MOCK DATA ONLY
            await new Promise(resolve => setTimeout(resolve, 300));
            MOCK_TASKS = MOCK_TASKS.map(t => t.id === task.id ? task : t);
            return task;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task updated successfully (Mock)');
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
