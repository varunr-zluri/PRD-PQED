import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalDashboard from '../ApprovalDashboard';

// Mock API client
const mockGetRequests = jest.fn();
const mockGetPods = jest.fn();

jest.mock('../../api/client', () => ({
    getRequests: (...args) => mockGetRequests(...args),
    getPods: (...args) => mockGetPods(...args)
}));

jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn()
    }
}));

// Mock RequestDetailModal
jest.mock('../../components/RequestDetailModal', () => {
    return function MockModal({ isOpen, onClose }) {
        if (!isOpen) return null;
        return <div data-testid="modal">Modal <button onClick={onClose}>Close</button></div>;
    };
});

describe('ApprovalDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetRequests.mockResolvedValue({
            requests: [],
            page: 1,
            pages: 1,
            total: 0
        });
        mockGetPods.mockResolvedValue([
            { pod_name: 'pod-1', display_name: 'Pod 1' }
        ]);
    });

    it('renders page title', async () => {
        render(<ApprovalDashboard />);

        expect(screen.getByText('Approval Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Review and manage pending query requests')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });
    });

    it('shows loading state initially', () => {
        render(<ApprovalDashboard />);

        expect(screen.getByText('Loading requests...')).toBeInTheDocument();
    });

    it('shows empty state when no requests', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('No requests found')).toBeInTheDocument();
        });
    });

    it('renders requests table when data exists', async () => {
        mockGetRequests.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'postgres-prod',
                database_name: 'users',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users',
                requester: { email: 'dev@test.com' },
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
            expect(screen.getByText('postgres-prod')).toBeInTheDocument();
            expect(screen.getByText('users')).toBeInTheDocument();
        });
    });

    it('renders status filter', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('All Status')).toBeInTheDocument();
        });
    });

    it('renders POD filter', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('All PODs')).toBeInTheDocument();
        });
    });

    it('renders search input', async () => {
        render(<ApprovalDashboard />);

        expect(screen.getByPlaceholderText('Search queries...')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });
    });

    it('renders date filters', async () => {
        render(<ApprovalDashboard />);

        expect(screen.getByText('Start Date')).toBeInTheDocument();
        expect(screen.getByText('End Date')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });
    });

    it('handles filter change', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });

        const statusSelect = screen.getByDisplayValue('All Status');
        fireEvent.change(statusSelect, { target: { name: 'status', value: 'PENDING' } });

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING'
            }));
        });
    });

    it('handles search change', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });

        const searchInput = screen.getByPlaceholderText('Search queries...');
        fireEvent.change(searchInput, { target: { name: 'search', value: 'SELECT' } });

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalledWith(expect.objectContaining({
                search: 'SELECT'
            }));
        });
    });

    it('opens modal when view button is clicked', async () => {
        mockGetRequests.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'test',
                database_name: 'db',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                requester: { email: 'test@test.com' },
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
        });

        const viewButton = screen.getByTitle('View Details');
        fireEvent.click(viewButton);

        expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('handles API error gracefully', async () => {
        mockGetRequests.mockRejectedValue(new Error('API Error'));

        render(<ApprovalDashboard />);

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.error).toHaveBeenCalledWith('Failed to load requests');
        });
    });

    it('renders script type correctly', async () => {
        mockGetRequests.mockResolvedValue({
            requests: [{
                id: 2,
                instance_name: 'mongo-prod',
                database_name: 'analytics',
                db_type: 'MONGODB',
                submission_type: 'SCRIPT',
                query_content: null,
                requester: { email: 'dev@test.com' },
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Script')).toBeInTheDocument();
        });
    });
});
