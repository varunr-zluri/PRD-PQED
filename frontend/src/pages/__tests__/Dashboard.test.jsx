import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../Dashboard';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

// Default: Developer user
const mockUser = {
    name: 'Test Developer',
    email: 'dev@example.com',
    role: 'DEVELOPER',
    pod_name: 'pod-1'
};

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser
    })
}));

describe('Dashboard - Developer View', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser.role = 'DEVELOPER';
    });

    it('renders welcome message with user name', () => {
        render(<Dashboard />);

        expect(screen.getByText(/Welcome, Test Developer/)).toBeInTheDocument();
    });

    it('renders developer subtitle', () => {
        render(<Dashboard />);

        expect(screen.getByText(/Submit and track database queries/)).toBeInTheDocument();
    });

    it('renders Submit New Request action card', () => {
        render(<Dashboard />);

        expect(screen.getByText('Submit New Request')).toBeInTheDocument();
        expect(screen.getByText(/Submit a database query or script/)).toBeInTheDocument();
    });

    it('renders My Submissions action card', () => {
        render(<Dashboard />);

        expect(screen.getByText('My Submissions')).toBeInTheDocument();
        expect(screen.getByText(/View your submission history/)).toBeInTheDocument();
    });

    it('navigates to submit page when Submit New Request is clicked', () => {
        render(<Dashboard />);

        const submitCard = screen.getByText('Submit New Request').closest('.card');
        fireEvent.click(submitCard);

        expect(mockNavigate).toHaveBeenCalledWith('/submit');
    });

    it('navigates to history page when My Submissions is clicked', () => {
        render(<Dashboard />);

        const historyCard = screen.getByText('My Submissions').closest('.card');
        fireEvent.click(historyCard);

        expect(mockNavigate).toHaveBeenCalledWith('/history');
    });

    it('renders Your Profile section', () => {
        render(<Dashboard />);

        expect(screen.getByText('Your Profile')).toBeInTheDocument();
    });

    it('displays user info in profile section', () => {
        render(<Dashboard />);

        expect(screen.getByText('Test Developer')).toBeInTheDocument();
        expect(screen.getByText('dev@example.com')).toBeInTheDocument();
        expect(screen.getByText('pod-1')).toBeInTheDocument();
    });

    it('handles mouse enter on action cards', () => {
        render(<Dashboard />);

        const card = screen.getByText('Submit New Request').closest('.card');
        fireEvent.mouseEnter(card);

        // Should update styles
        expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    it('handles mouse leave on action cards', () => {
        render(<Dashboard />);

        const card = screen.getByText('Submit New Request').closest('.card');
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);

        expect(card).toBeInTheDocument();
    });
});

describe('Dashboard - Manager View', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser.role = 'MANAGER';
    });

    it('renders manager subtitle for managers', () => {
        render(<Dashboard />);

        expect(screen.getByText(/Manage and approve database query requests/)).toBeInTheDocument();
    });

    it('renders Approval Dashboard action for managers', () => {
        render(<Dashboard />);

        expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
    });

    it('navigates to approvals page for managers', () => {
        render(<Dashboard />);

        const approvalCard = screen.getByText('Approval Dashboard').closest('.card');
        fireEvent.click(approvalCard);

        expect(mockNavigate).toHaveBeenCalledWith('/approvals');
    });

    it('renders all actions for managers (including developer actions)', () => {
        render(<Dashboard />);

        expect(screen.getByText('Submit New Request')).toBeInTheDocument();
        expect(screen.getByText('My Submissions')).toBeInTheDocument();
        expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
    });
});

describe('Dashboard - Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders default values when user info is missing', () => {
        // Override mock for this specific test
        const emptyUser = {};
        jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockImplementation(() => ({
            user: emptyUser
        }));

        render(<Dashboard />);

        expect(screen.getByText('Welcome, User')).toBeInTheDocument();
        const profileCard = screen.getByText('Your Profile').closest('.card');

        // Check for dashes in profile section
        const values = screen.getAllByText('—');
        expect(values.length).toBeGreaterThanOrEqual(4); // Name, Email, Role, Pod
    });

    it('does not show manager actions for developers', () => {
        const devUser = { role: 'DEVELOPER' };
        jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockImplementation(() => ({
            user: devUser
        }));

        render(<Dashboard />);

        expect(screen.queryByText('Approval Dashboard')).not.toBeInTheDocument();
    });
});
