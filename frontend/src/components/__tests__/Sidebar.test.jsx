import { render, screen, fireEvent } from '@testing-library/react';

// Mock the navigate function
const mockNavigate = jest.fn();
const mockLogout = jest.fn();

// Mock react-router-dom completely
jest.mock('react-router-dom', () => ({
    NavLink: ({ children, to, className, style }) => {
        const isActive = to === '/';
        const classStr = typeof className === 'function' ? className({ isActive }) : className;
        const styleObj = typeof style === 'function' ? style({ isActive }) : style;

        return (
            <a
                href={to}
                className={classStr}
                style={styleObj}
                data-testid={`nav-${to.replace('/', '') || 'home'}`}
            >
                {children}
            </a>
        );
    },
    useNavigate: () => mockNavigate
}));

// Mock the AuthContext with a changeable implementation
let mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    role: 'DEVELOPER'
};

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        logout: mockLogout
    })
}));

// Mock the logo
jest.mock('../../assets/logo.svg', () => 'test-logo.svg');

import Sidebar from '../Sidebar';

describe('Sidebar', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset user to default
        mockUser = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            username: 'testuser',
            role: 'DEVELOPER'
        };
    });

    it('renders logo', () => {
        render(<Sidebar />);
        expect(screen.getByAltText('Zluri')).toBeInTheDocument();
    });

    it('renders navigation items for developer', () => {
        render(<Sidebar />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('New Request')).toBeInTheDocument();
        expect(screen.getByText('My Submissions')).toBeInTheDocument();
        // Approval Dashboard should be hidden for developers
        expect(screen.queryByText('Approval Dashboard')).not.toBeInTheDocument();
    });

    it('renders navigation items for manager', () => {
        mockUser = { ...mockUser, role: 'MANAGER' };
        render(<Sidebar />);

        expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
    });

    it('renders user info with username', () => {
        render(<Sidebar />);

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('renders user info with email fallback', () => {
        mockUser = { ...mockUser, username: null };
        render(<Sidebar />);

        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders logout button', () => {
        render(<Sidebar />);
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls logout on button click', () => {
        render(<Sidebar />);

        const logoutButton = screen.getByText('Logout');
        fireEvent.click(logoutButton);

        expect(mockLogout).toHaveBeenCalled();
    });

    it('navigates to profile on user info click', () => {
        render(<Sidebar />);

        const userInfo = screen.getByText('Test User');
        fireEvent.click(userInfo);

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('renders active nav item with correct styling', () => {
        render(<Sidebar />);

        // Dashboard is active because to="/" in mock maps to isActive=true
        const dashboardLink = screen.getByTestId('nav-home');

        expect(dashboardLink).toHaveClass('nav-item');
        expect(dashboardLink).toHaveClass('active');
        // Check background color which is set on active state
        expect(dashboardLink).toHaveStyle({ backgroundColor: 'rgba(139, 92, 246, 0.1)' });
    });

    it('renders inactive nav item with correct styling', () => {
        render(<Sidebar />);

        // New Request is inactive
        const requestLink = screen.getByTestId('nav-submit');

        expect(requestLink).toHaveClass('nav-item');
        expect(requestLink).not.toHaveClass('active');
        // Inactive items don't have the active background color
    });
});
