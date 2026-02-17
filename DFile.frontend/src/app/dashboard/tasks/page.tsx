"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, User, Clock, CheckCircle2, Circle, AlertCircle, Search, Filter, Archive, RotateCcw, Layout, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/types/task";
import { useAuth } from "@/contexts/auth-context";
import { useTasks, useAddTask, useUpdateTask, useArchiveTask, useRestoreTask } from "@/hooks/use-tasks";
import { useEmployees } from "@/hooks/use-organization";

export default function TasksPage() {
    const [showArchived, setShowArchived] = useState(false);
    const { data: tasks = [] } = useTasks(showArchived);
    const { data: employees = [] } = useEmployees();

    const addTaskMutation = useAddTask();
    const updateTaskMutation = useUpdateTask();
    const archiveTaskMutation = useArchiveTask();
    const restoreTaskMutation = useRestoreTask();

    const { user } = useAuth();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Form State
    const [newTask, setNewTask] = useState<Partial<Task>>({
        priority: "Medium",
        status: "Pending"
    });

    const handleCreate = async () => {
        if (!newTask.title) return;

        const task: Task = {
            id: `task_${Date.now()}`, // Backend generates ID, but this is safe for optimistic UI if needed, though hook handles it
            title: newTask.title,
            description: newTask.description || "",
            priority: newTask.priority as any,
            status: "Pending",
            assignedTo: newTask.assignedTo,
            dueDate: newTask.dueDate,
            createdAt: new Date().toISOString()
        };

        // Let backend handle ID generation usually, but here we pass full object
        // Correct approach: Pass object without ID if backend generates it, or pass ID. 
        // Our hook types Task, which expects ID. The backend handles it if we pass it, or we can omit. 
        // For now, let's stick to existing pattern or let backend ignore ID.
        await addTaskMutation.mutateAsync(task);
        setIsCreateOpen(false);
        setNewTask({ priority: "Medium", status: "Pending" });
    };

    const handleStatusUpdate = async (task: Task, newStatus: Task['status']) => {
        await updateTaskMutation.mutateAsync({ ...task, status: newStatus });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "High": return "text-red-500 bg-red-100 dark:bg-red-900/30";
            case "Medium": return "text-amber-500 bg-amber-100 dark:bg-amber-900/30";
            case "Low": return "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30";
            default: return "text-slate-500 bg-slate-100";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Completed": return <CheckCircle2 size={16} className="text-emerald-500" />;
            case "In Progress": return <Clock size={16} className="text-blue-500" />;
            default: return <Circle size={16} className="text-slate-400" />;
        }
    };

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <Card className="border-border">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <ListTodo size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Task Details</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">{showArchived ? "Archived" : "Active"} Tasks</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-xs font-medium h-8" onClick={() => setShowArchived(!showArchived)}>
                            {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active Tasks</> : <><Archive size={14} className="mr-1.5" />Archived Tasks</>}
                        </Button>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="rounded-xl h-8 text-xs bg-primary text-primary-foreground shadow-sm">
                                    <Plus size={14} className="mr-1.5" /> Create Task
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Create New Task</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                            placeholder="Task title..."
                                            value={newTask.title || ""}
                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            placeholder="Details..."
                                            value={newTask.description || ""}
                                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <Select
                                                value={newTask.priority}
                                                onValueChange={v => setNewTask({ ...newTask, priority: v as any })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Low">Low</SelectItem>
                                                    <SelectItem value="Medium">Medium</SelectItem>
                                                    <SelectItem value="High">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Due Date</Label>
                                            <Input
                                                type="date"
                                                value={newTask.dueDate || ""}
                                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assign To</Label>
                                        <Select
                                            value={newTask.assignedTo}
                                            onValueChange={v => setNewTask({ ...newTask, assignedTo: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select employee" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {employees.map(e => (
                                                    <SelectItem key={e.id} value={e.id}>
                                                        {e.firstName} {e.lastName} ({e.role})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleCreate} className="w-full">Create Task</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-9 bg-background">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Content */}
                <div className="p-6 bg-card min-h-[400px]">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTasks.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <ListTodo size={48} className="mb-4 opacity-20" />
                                <p>No {showArchived ? 'archived' : 'active'} tasks found</p>
                            </div>
                        ) : (
                            filteredTasks.map(task => {
                                const assignedEmployee = employees.find(e => e.id === task.assignedTo);
                                return (
                                    <Card key={task.id} className="hover:shadow-md transition-shadow relative overflow-hidden group border-border">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.priority === 'High' ? 'bg-red-500' :
                                            task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`} />
                                        <CardHeader className="pl-6 pb-2">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className={`mb-2 border-0 ${getPriorityColor(task.priority)}`}>
                                                    {task.priority} Priority
                                                </Badge>
                                                <div className="flex gap-1">
                                                    {/* Status Actions */}
                                                    {!showArchived && task.status !== 'Completed' && (
                                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleStatusUpdate(task, 'Completed')} title="Mark Complete">
                                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                                        </Button>
                                                    )}
                                                    {showArchived ? (
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => restoreTaskMutation.mutateAsync(task.id)} title="Restore Task">
                                                            <RotateCcw size={14} />
                                                        </Button>
                                                    ) : (
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => archiveTaskMutation.mutateAsync(task.id)} title="Archive Task">
                                                            <Archive size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
                                            <CardDescription className="line-clamp-2 mt-1">{task.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pl-6 pt-2 text-sm">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar size={14} />
                                                    <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <User size={14} />
                                                    <span>{assignedEmployee ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}` : "Unassigned"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                                                    {getStatusIcon(task.status)}
                                                    <span className="font-medium text-foreground">{task.status}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
