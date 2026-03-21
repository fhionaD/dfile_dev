"use client";

export type GlobalErrorLevel = "error" | "warning";

export type GlobalErrorPayload = {
    id: string;
    title: string;
    message: string;
    level: GlobalErrorLevel;
    timestamp: number;
};

const EVENT_NAME = "dfile:global-error";

export function emitGlobalError(payload: Omit<GlobalErrorPayload, "id" | "timestamp">) {
    if (typeof window === "undefined") return;

    const detail: GlobalErrorPayload = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        ...payload,
    };

    window.dispatchEvent(new CustomEvent<GlobalErrorPayload>(EVENT_NAME, { detail }));
}

export function subscribeGlobalError(listener: (payload: GlobalErrorPayload) => void) {
    if (typeof window === "undefined") return () => undefined;

    const handler = (event: Event) => {
        const customEvent = event as CustomEvent<GlobalErrorPayload>;
        if (customEvent.detail) listener(customEvent.detail);
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
