
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Data is fresh for 1 minute
                staleTime: 60 * 1000,
                // Retry failed queries 1 time
                retry: 1,
                // Refetch on window focus
                refetchOnWindowFocus: false,
            },
        },
    }));

    // Expose queryClient globally for logout flow to access it
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__queryClient = queryClient;
        }
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
