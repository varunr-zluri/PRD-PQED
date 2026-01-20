import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

// Mock axios to avoid import errors in api/client
jest.mock('axios', () => ({
    create: () => ({
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        },
        get: jest.fn(),
        post: jest.fn()
    })
}));

// Mock api/client
jest.mock('../../api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        }
    }
}));

import api from '../../api/client';

jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    }
}));

const TestComponent = () => {
    const { login, signup, logout, user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return (
        <div>
            <div data-testid="user">{user ? user.name : 'No User'}</div>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <button onClick={() => signup({ name: 'Test' })}>Signup</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('handles login success', async () => {
        api.get.mockResolvedValueOnce({ data: null }); // checkAuth
        api.post.mockResolvedValueOnce({
            data: { token: 'token', user: { name: 'Test User' } }
        });

        render(<AuthProvider><TestComponent /></AuthProvider>);
        await waitFor(() => screen.getByTestId('user'));

        await act(async () => screen.getByText('Login').click());

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Login successful');
            expect(screen.getByTestId('user')).toHaveTextContent('Test User');
        });
    });

    it('handles login failure', async () => {
        api.get.mockResolvedValueOnce({ data: null });
        api.post.mockRejectedValueOnce({
            response: { data: { error: 'Failed' } }
        });

        render(<AuthProvider><TestComponent /></AuthProvider>);
        await waitFor(() => screen.getByTestId('user'));

        await act(async () => screen.getByText('Login').click());

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed');
        });
    });

    it('handles signup success', async () => {
        api.get.mockResolvedValueOnce({ data: null });
        api.post.mockResolvedValueOnce({ data: {} });

        render(<AuthProvider><TestComponent /></AuthProvider>);
        await waitFor(() => screen.getByTestId('user'));

        await act(async () => screen.getByText('Signup').click());

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith('Signup successful. Please login.');
        });
    });

    it('handles logout', async () => {
        api.get.mockResolvedValueOnce({ data: null });
        render(<AuthProvider><TestComponent /></AuthProvider>);
        await waitFor(() => screen.getByTestId('user'));

        await act(async () => screen.getByText('Logout').click());
        expect(toast.info).toHaveBeenCalledWith('Logged out');
    });
});
