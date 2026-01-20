import { render, screen } from '@testing-library/react';

// Mock the navigate function
const mockNavigate = jest.fn();

// Mock react-router-dom completely
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

// Mock the AuthContext with different states
const mockUseAuth = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

import NotFound from '../NotFound';

describe('NotFound', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('redirects authenticated user to dashboard', () => {
        mockUseAuth.mockReturnValue({
            user: { id: 1, name: 'Test User' },
            loading: false
        });

        render(<NotFound />);

        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('redirects unauthenticated user to login', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false
        });

        render(<NotFound />);

        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('shows loading spinner while checking auth', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: true
        });

        render(<NotFound />);

        expect(screen.getByText('Redirecting...')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('renders spinner element', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: true
        });

        const { container } = render(<NotFound />);

        expect(container.querySelector('.spinner')).toBeInTheDocument();
    });
});
