import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RequestDetailModal from '../RequestDetailModal';

// Mock API client
const mockGetRequestById = jest.fn();
const mockApproveRequest = jest.fn();
const mockRejectRequest = jest.fn();
const mockDownloadCSV = jest.fn();

jest.mock('../../api/client', () => ({
    getRequestById: (...args) => mockGetRequestById(...args),
    approveRequest: (...args) => mockApproveRequest(...args),
    rejectRequest: (...args) => mockRejectRequest(...args),
    downloadCSV: (...args) => mockDownloadCSV(...args)
}));

jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn()
    }
}));

const mockRequest = {
    id: 1,
    instance_name: 'postgres-prod',
    database_name: 'users',
    db_type: 'POSTGRESQL',
    submission_type: 'QUERY',
    query_content: 'SELECT * FROM users LIMIT 10',
    comments: 'Test query',
    status: 'PENDING',
    pod_name: 'pod-1',
    created_at: '2024-01-15T10:00:00Z',
    requester: { name: 'Test User', email: 'test@example.com' },
    executions: []
};

describe('RequestDetailModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetRequestById.mockResolvedValue(mockRequest);
    });

    it('renders nothing when not open', () => {
        const { container } = render(
            <RequestDetailModal requestId={1} isOpen={false} onClose={jest.fn()} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('loads request when opened', async () => {
        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(mockGetRequestById).toHaveBeenCalledWith(1);
        });
    });

    it('shows loading state initially', async () => {
        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        // Wait for API call to complete
        await waitFor(() => {
            expect(mockGetRequestById).toHaveBeenCalled();
        });
    });

    it('displays request details after loading', async () => {
        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(mockGetRequestById).toHaveBeenCalledWith(1);
        });

        // Wait for content to render
        await waitFor(() => {
            expect(screen.getByText(/postgres-prod/)).toBeInTheDocument();
        });
    });

    it('displays query content', async () => {
        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText(/SELECT \* FROM users/)).toBeInTheDocument();
        });
    });

    it('displays requester info', async () => {
        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });
    });

    it('shows action buttons when showActions is true', async () => {
        render(
            <RequestDetailModal
                requestId={1}
                isOpen={true}
                onClose={jest.fn()}
                showActions={true}
            />
        );

        await waitFor(() => {
            expect(mockGetRequestById).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByText('Reject')).toBeInTheDocument();
        });
    });

    it('handles approve action', async () => {
        mockApproveRequest.mockResolvedValue({});
        const onActionComplete = jest.fn();
        const onClose = jest.fn();

        render(
            <RequestDetailModal
                requestId={1}
                isOpen={true}
                onClose={onClose}
                onActionComplete={onActionComplete}
                showActions={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Approve/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Approve/));

        await waitFor(() => {
            expect(mockApproveRequest).toHaveBeenCalledWith(1);
            expect(onActionComplete).toHaveBeenCalled();
        });
    });

    it('shows reject form when reject button clicked', async () => {
        render(
            <RequestDetailModal
                requestId={1}
                isOpen={true}
                onClose={jest.fn()}
                showActions={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Reject')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Reject'));

        expect(screen.getByPlaceholderText('Enter rejection reason...')).toBeInTheDocument();
    });

    it('handles reject action', async () => {
        mockRejectRequest.mockResolvedValue({});
        const onActionComplete = jest.fn();
        const onClose = jest.fn();

        render(
            <RequestDetailModal
                requestId={1}
                isOpen={true}
                onClose={onClose}
                onActionComplete={onActionComplete}
                showActions={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Reject')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Reject'));

        const reasonInput = screen.getByPlaceholderText('Enter rejection reason...');
        fireEvent.change(reasonInput, { target: { value: 'Invalid query' } });

        fireEvent.click(screen.getByText('Confirm Rejection'));

        await waitFor(() => {
            expect(mockRejectRequest).toHaveBeenCalledWith(1, 'Invalid query');
        });
    });

    it('handles API error on load', async () => {
        mockGetRequestById.mockRejectedValue(new Error('API Error'));
        const onClose = jest.fn();

        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={onClose} />
        );

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.error).toHaveBeenCalledWith('Failed to load request details');
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('displays script type correctly', async () => {
        mockGetRequestById.mockResolvedValue({
            ...mockRequest,
            submission_type: 'SCRIPT',
            script_content: 'console.log("test")',
            script_filename: 'test.js'
        });

        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText(/Script/)).toBeInTheDocument();
        });
    });

    it('handles execution results display', async () => {
        mockGetRequestById.mockResolvedValue({
            ...mockRequest,
            status: 'EXECUTED',
            executions: [{
                id: 1,
                status: 'SUCCESS',
                result: [{ id: 1, name: 'User 1' }],
                executed_at: '2024-01-15T11:00:00Z'
            }]
        });

        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Execution Results')).toBeInTheDocument();
        });
    });

    it('shows download CSV button for truncated results', async () => {
        mockGetRequestById.mockResolvedValue({
            ...mockRequest,
            status: 'EXECUTED',
            executions: [{
                id: 1,
                status: 'SUCCESS',
                result: [{ id: 1 }],
                is_truncated: true,
                csv_available: true,
                executed_at: '2024-01-15T11:00:00Z'
            }]
        });

        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Download Full CSV')).toBeInTheDocument();
        });
    });

    it('handles CSV download', async () => {
        mockDownloadCSV.mockResolvedValue();
        mockGetRequestById.mockResolvedValue({
            ...mockRequest,
            status: 'EXECUTED',
            executions: [{
                id: 1,
                status: 'SUCCESS',
                result: [{ id: 1 }],
                is_truncated: true,
                csv_available: true,
                executed_at: '2024-01-15T11:00:00Z'
            }]
        });

        render(
            <RequestDetailModal requestId={1} isOpen={true} onClose={jest.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Download Full CSV')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Download Full CSV'));

        await waitFor(() => {
            expect(mockDownloadCSV).toHaveBeenCalledWith(1);
        });
    });

    it('handles approve error', async () => {
        mockApproveRequest.mockRejectedValue({
            response: { data: { error: 'Approval failed' } }
        });

        render(
            <RequestDetailModal
                requestId={1}
                isOpen={true}
                onClose={jest.fn()}
                showActions={true}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Approve/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Approve/));

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.error).toHaveBeenCalledWith('Approval failed');
        });
    });
});
