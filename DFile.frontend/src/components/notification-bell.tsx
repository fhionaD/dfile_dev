'use client';

import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '@/hooks/use-notifications';
import type { Notification, NotificationType } from '@/types/asset';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const typeConfig: Record<NotificationType, { icon: typeof Info; className: string }> = {
    Info: { icon: Info, className: 'text-blue-500' },
    Warning: { icon: AlertTriangle, className: 'text-amber-500' },
    Success: { icon: CheckCircle, className: 'text-emerald-500' },
    Error: { icon: XCircle, className: 'text-red-500' },
};

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const { data: notifications = [] } = useNotifications();
    const { data: unreadCount = 0 } = useUnreadCount();
    const markRead = useMarkAsRead();
    const markAllRead = useMarkAllAsRead();
    const deleteNotification = useDeleteNotification();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 relative text-muted-foreground hover:text-foreground hover:bg-accent"
                    aria-label="Notifications"
                >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold ring-2 ring-background">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => markAllRead.mutate()}
                        >
                            <CheckCheck size={14} />
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="max-h-96">
                    {notifications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-sm">
                            No notifications
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((n: Notification) => {
                                const config = typeConfig[n.type] ?? typeConfig.Info;
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            'flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group',
                                            !n.isRead && 'bg-accent/30'
                                        )}
                                    >
                                        <Icon size={16} className={cn('mt-0.5 shrink-0', config.className)} />
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className={cn('text-sm leading-snug', !n.isRead && 'font-medium')}>
                                                {n.message}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {n.module && (
                                                    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                                        {n.module}
                                                    </span>
                                                )}
                                                <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!n.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => markRead.mutate(n.id)}
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteNotification.mutate(n.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
