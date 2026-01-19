import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock api client
const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('../../api/client', () => ({
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args)
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    }
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses the context
const TestConsumer = () => {
    const { user, login, signup, logout, loading } = useAuth();

    return (
        <div>
            <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
            <div data-testid="user">{user ? user.name : 'no user'}</div>
            <button data-testid="login-btn" onClick={() => login('test@example.com', 'password')}>Login</button>
            <button data-testid="login-username-btn" onClick={() => login('testuser', 'password')}>Login Username</button>
            <button data-testid="signup-btn" onClick={() => signup({ email: 'new@example.com', password: 'pass' })}>Signup</button>
            <button data-testid="logout-btn" onClick={logout}>Logout</button>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('provides initial loading state', async () => {
        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });
    });

    it('provides null user when not authenticated', async () => {
        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('no user');
        });
    });

    it('checks auth on mount when token exists', async () => {
        localStorageMock.getItem.mockReturnValue('valid-token');
        mockGet.mockResolvedValue({ data: { name: 'Test User' } });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('/auth/me');
            expect(screen.getByTestId('user')).toHaveTextContent('Test User');
        });
    });

    it('clears token on auth check failure', async () => {
        localStorageMock.getItem.mockReturnValue('invalid-token');
        mockGet.mockRejectedValue(new Error('Invalid token'));

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
            expect(screen.getByTestId('user')).toHaveTextContent('no user');
        });
    });

    it('logs in with email successfully', async () => {
        mockPost.mockResolvedValue({
            data: { token: 'new-token', user: { name: 'Logged In User' } }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await act(async () => {
            screen.getByTestId('login-btn').click();
        });

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/auth/login', {
                email: 'test@example.com',
                password: 'password'
            });
            expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
        });
    });

    it('logs in with username successfully', async () => {
        mockPost.mockResolvedValue({
            data: { token: 'new-token', user: { name: 'Logged In User' } }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await act(async () => {
            screen.getByTestId('login-username-btn').click();
        });

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/auth/login', {
                username: 'testuser',
                password: 'password'
            });
        });
    });

    it('handles login failure', async () => {
        mockPost.mockRejectedValue({
            response: { data: { error: 'Invalid credentials' } }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await act(async () => {
            screen.getByTestId('login-btn').click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('no user');
        });
    });

    it('signs up successfully', async () => {
        mockPost.mockResolvedValue({ data: { message: 'Success' } });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await act(async () => {
            screen.getByTestId('signup-btn').click();
        });

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('/auth/signup', {
                email: 'new@example.com',
                password: 'pass'
            });
        });
    });

    it('handles signup failure', async () => {
        mockPost.mockRejectedValue({
            response: { data: { message: 'Email already exists' } }
        });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('ready');
        });

        await act(async () => {
            screen.getByTestId('signup-btn').click();
        });

        // Should not crash
        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('no user');
        });
    });

    it('logs out successfully', async () => {
        localStorageMock.getItem.mockReturnValue('valid-token');
        mockGet.mockResolvedValue({ data: { name: 'Test User' } });

        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('Test User');
        });

        await act(async () => {
            screen.getByTestId('logout-btn').click();
        });

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
    });
});
