/**
 * Tests for RouteWrappers (ProtectedRoute, ManagerRoute)
 */
import { render, screen } from '@testing-library/react';
import { ProtectedRoute, ManagerRoute } from '../RouteWrappers';

// Mock Navigate
jest.mock('react-router-dom', () => ({
    Navigate: ({ to }) => <div data-testid={`navigate-to-${to.replace('/', '') || 'home'}`}>Navigate to {to}</div>
}));

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

describe('ProtectedRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows loading spinner when loading', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders spinner element during loading', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: true });

        const { container } = render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(container.querySelector('.spinner')).toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByTestId('navigate-to-login')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: 'Test User', role: 'DEVELOPER' },
            loading: false
        });

        render(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});

describe('ManagerRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('redirects developers to home', () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: 'Developer', role: 'DEVELOPER' },
            loading: false
        });

        render(
            <ManagerRoute>
                <div>Manager Content</div>
            </ManagerRoute>
        );

        expect(screen.getByTestId('navigate-to-home')).toBeInTheDocument();
        expect(screen.queryByText('Manager Content')).not.toBeInTheDocument();
    });

    it('renders children for managers', () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: 'Manager', role: 'MANAGER' },
            loading: false
        });

        render(
            <ManagerRoute>
                <div>Manager Content</div>
            </ManagerRoute>
        );

        expect(screen.getByText('Manager Content')).toBeInTheDocument();
    });

    it('redirects when user is null', () => {
        mockUseAuth.mockReturnValue({ user: null, loading: false });

        render(
            <ManagerRoute>
                <div>Manager Content</div>
            </ManagerRoute>
        );

        expect(screen.getByTestId('navigate-to-home')).toBeInTheDocument();
    });
});
