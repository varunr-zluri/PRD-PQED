import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalDashboard from '../ApprovalDashboard';

// Mock API client
const mockGetRequests = jest.fn();

jest.mock('../../api/client', () => ({
    getRequests: (...args) => mockGetRequests(...args)
}));

jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
        warning: jest.fn()
    }
}));

// Mock RequestDetailModal
jest.mock('../../components/RequestDetailModal', () => {
    return function MockModal({ isOpen, onClose, onActionComplete }) {
        if (!isOpen) return null;
        return (
            <div data-testid="modal">
                Modal
                <button onClick={onClose}>Close</button>
                {onActionComplete && (
                    <button onClick={onActionComplete} data-testid="complete-action">Complete</button>
                )}
            </div>
        );
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

    it('renders submission type filter', async () => {
        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByText('All Types')).toBeInTheDocument();
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
    it('handles date filter auto-fill and validation', async () => {
        render(<ApprovalDashboard />);

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        // Test: Auto-set end date
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-01-01' } });

        await waitFor(() => {
            const today = new Date().toISOString().split('T')[0];
            expect(endDateInput.value).toBe(today);
        });

        // Test: Auto-set start date
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '' } });
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '' } });

        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-15' } });

        await waitFor(() => {
            expect(startDateInput.value).toBe('2020-01-01');
        });

        // Test: Validation warnings
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-10' } });
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-01-20' } });

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.warning).toHaveBeenCalledWith('Start date cannot be after end date. End date adjusted.');
            expect(endDateInput.value).toBe('2024-01-20');
        });

        // Test: End date < Start date
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-02-01' } });
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-01' } });

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.warning).toHaveBeenCalledWith('End date cannot be before start date. Start date adjusted.');
            expect(startDateInput.value).toBe('2024-01-01');
        });
    });

    it('handles pagination interactions', async () => {
        mockGetRequests.mockResolvedValue({
            requests: [],
            page: 1,
            pages: 2,
            total: 15
        });

        render(<ApprovalDashboard />);

        await waitFor(() => {
            expect(screen.getByLabelText('Page 1')).toHaveClass('active');
        });

        const nextButton = screen.getByLabelText('Next Page');
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
        });
    });

    it('opens modal on query preview click', async () => {
        mockGetRequests.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'test',
                database_name: 'db',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users',
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
            expect(screen.getByText('SELECT * FROM users')).toBeInTheDocument();
        });

        // Click on the preview text
        fireEvent.click(screen.getByText('SELECT * FROM users'));

        expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('refreshes data on action completion', async () => {
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

        mockGetRequests.mockClear();

        fireEvent.click(screen.getByTitle('View Details'));

        const completeBtn = screen.getByTestId('complete-action');
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(mockGetRequests).toHaveBeenCalled();
        });
    });
});
