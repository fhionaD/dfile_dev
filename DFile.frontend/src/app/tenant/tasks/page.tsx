"use client";

import { useState } from "react";
import { useTasks, useAddTask, useArchiveTask } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/types/task";

export default function TasksPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const { data: tasks = [], isLoading } = useTasks(false);
    const addTask = useAddTask();
    const archiveTask = useArchiveTask();

    const handleCreate = async () => {
        if (!title.trim()) return;
        await addTask.mutateAsync({
            title: title.trim(),
            description: description.trim() || undefined,
            priority: "Medium",
            status: "Pending",
        });
        setTitle("");
        setDescription("");
        setCreateOpen(false);
    };

    return (
        <div className="space-y-6 p-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
                    <p className="text-sm text-muted-foreground">
                        Track operational work items for your organization.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>Create task</Button>
            </div>

            <div className="rounded-xl border border-border bg-card">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : tasks.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">No active tasks.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Due</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((t: Task) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium max-w-[240px]">
                                        <div className="truncate">{t.title}</div>
                                        {t.description ? (
                                            <div className="text-xs text-muted-foreground truncate">
                                                {t.description}
                                            </div>
                                        ) : null}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{t.status}</Badge>
                                    </TableCell>
                                    <TableCell>{t.priority}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => archiveTask.mutate(t.id)}
                                            disabled={archiveTask.isPending}
                                        >
                                            Archive
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New task</DialogTitle>
                        <DialogDescription>
                            Add a title and optional details. You can archive tasks from the list when they are done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="task-title">Title</Label>
                            <Input
                                id="task-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Short summary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task-desc">Description</Label>
                            <Textarea
                                id="task-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Optional details"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => void handleCreate()} disabled={addTask.isPending}>
                            {addTask.isPending ? "Saving…" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
