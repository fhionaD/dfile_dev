export interface Task {
    id: string;
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Pending' | 'In Progress' | 'Completed';
    assignedTo?: string; // Employee ID or Name
    dueDate?: string;
    createdAt: string;
    archived?: boolean;
}
