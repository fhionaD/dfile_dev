import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// --- localStorage mock (replaces jsdom's storage to avoid environment-specific issues) ---
const _store: Record<string, string> = {};
const localStorageMock: Storage = {
    getItem: (key: string) => _store[key] ?? null,
    setItem: (key: string, value: string) => { _store[key] = value; },
    removeItem: (key: string) => { delete _store[key]; },
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
    get length() { return Object.keys(_store).length; },
    key: (i: number) => Object.keys(_store)[i] ?? null,
};

beforeAll(() => {
    vi.stubGlobal('localStorage', localStorageMock);
});

afterAll(() => {
    vi.unstubAllGlobals();
});

// --- Module mocks ---
vi.mock('@/lib/api', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

vi.mock('@/components/query-provider', () => ({
    globalQueryClient: { clear: vi.fn() },
}));

// Mock axios so we can control isAxiosError.
// Both default.isAxiosError and the named export must share the SAME vi.fn()
// instance — auth-context imports the named export, tests call axios.isAxiosError.
vi.mock('axios', async (importOriginal) => {
    const actual = await importOriginal() as typeof import('axios');
    const sharedIsAxiosError = vi.fn();
    return {
        default: {
            ...actual.default,
            isAxiosError: sharedIsAxiosError,
        },
        isAxiosError: sharedIsAxiosError,
    };
});

import api from '@/lib/api';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import axios from 'axios';
import { renderHook } from '@testing-library/react';

const mockUser = {
    id: '1',
    email: 'admin@dfile.local',
    firstName: 'Admin',
    lastName: 'User',
    role: 'Admin',
    tenantId: 'tenant-1',
};
const mockToken = 'eyJhbGciOiJIUzI1NiJ9.test.signature';

// Helper: exposes auth state
function AuthConsumer() {
    const { user, isLoggedIn, isLoading } = useAuth();
    return (
        <div>
            <span data-testid="logged-in">{String(isLoggedIn)}</span>
            <span data-testid="loading">{String(isLoading)}</span>
            <span data-testid="user-email">{user?.email ?? 'none'}</span>
        </div>
    );
}

function AuthConsumerWithLogout() {
    const { isLoggedIn, logout } = useAuth();
    return (
        <div>
            <span data-testid="logged-in">{String(isLoggedIn)}</span>
            <button onClick={logout} data-testid="logout-btn">Logout</button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
        // Suppress background /api/auth/me validation
        (api.get as ReturnType<typeof vi.fn>).mockRejectedValue({ response: { status: 401 } });
    });

    afterEach(() => {
        localStorageMock.clear();
    });

    it('starts with isLoggedIn=false when no stored session', async () => {
        await act(async () => {
            render(
                <AuthProvider>
                    <AuthConsumer />
                </AuthProvider>
            );
        });

        expect(screen.getByTestId('logged-in').textContent).toBe('false');
        expect(screen.getByTestId('user-email').textContent).toBe('none');
    });

    it('login stores token and user in localStorage', async () => {
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: { user: mockUser, token: mockToken },
        });

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        await act(async () => {
            await result.current.login('admin@dfile.local', 'Admin@123');
        });

        expect(localStorageMock.getItem('dfile_token')).toBe(mockToken);
        const stored = JSON.parse(localStorageMock.getItem('dfile_user') ?? '{}');
        expect(stored.email).toBe('admin@dfile.local');
    });

    it('logout clears token and user from localStorage immediately (no delay)', async () => {
        localStorageMock.setItem('dfile_token', mockToken);
        localStorageMock.setItem('dfile_user', JSON.stringify(mockUser));

        await act(async () => {
            render(
                <AuthProvider>
                    <AuthConsumerWithLogout />
                </AuthProvider>
            );
        });

        const user = userEvent.setup();
        await act(async () => {
            await user.click(screen.getByTestId('logout-btn'));
        });

        expect(localStorageMock.getItem('dfile_token')).toBeNull();
        expect(localStorageMock.getItem('dfile_user')).toBeNull();
        expect(screen.getByTestId('logged-in').textContent).toBe('false');
    });

    it('production error message does not expose internal API details', async () => {
        // Simulate production environment
        vi.stubEnv('NODE_ENV', 'production');

        const networkError = Object.assign(new Error('ECONNREFUSED'), {
            isAxiosError: true,
            response: undefined,
            code: undefined,
        });
        (axios.isAxiosError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        let caughtError: Error | undefined;
        await act(async () => {
            try {
                await result.current.login('user@example.com', 'password');
            } catch (e) {
                caughtError = e as Error;
            }
        });

        // Message should NOT contain "dotnet run" or "localhost" in production
        expect(caughtError?.message).not.toContain('dotnet run');
        expect(caughtError?.message).not.toContain('localhost');
        expect(caughtError?.message).toContain('temporarily unavailable');

        vi.unstubAllEnvs();
    });
});
