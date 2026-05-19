
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Module-level reference so auth-context can call queryClient.clear() on logout
// without polluting the global window object.
export let globalQueryClient: QueryClient | null = null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => {
        const client = new QueryClient({
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
        });
        globalQueryClient = client;
        return client;
    });

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
