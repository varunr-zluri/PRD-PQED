import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MySubmissions from '../MySubmissions';

// Mock API client
const mockGetMySubmissions = jest.fn();
const mockGetPods = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../api/client', () => ({
    getMySubmissions: (...args) => mockGetMySubmissions(...args),
    getPods: (...args) => mockGetPods(...args)
}));

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
        info: jest.fn(),
        warning: jest.fn()
    }
}));

// Mock RequestDetailModal
jest.mock('../../components/RequestDetailModal', () => {
    return function MockModal({ isOpen, onClose }) {
        if (!isOpen) return null;
        return <div data-testid="modal">Modal <button onClick={onClose}>Close</button></div>;
    };
});

describe('MySubmissions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetMySubmissions.mockResolvedValue({
            requests: [],
            page: 1,
            pages: 1,
            total: 0
        });
        mockGetPods.mockResolvedValue([
            { pod_name: 'pod-1', display_name: 'Pod 1' }
        ]);
        sessionStorage.clear();
    });

    it('renders page title', async () => {
        render(<MySubmissions />);

        expect(screen.getByText('My Submissions')).toBeInTheDocument();
        expect(screen.getByText('View and track your query submission history')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetMySubmissions).toHaveBeenCalled();
        });
    });

    it('shows loading state initially', () => {
        render(<MySubmissions />);

        expect(screen.getByText('Loading submissions...')).toBeInTheDocument();
    });

    it('shows empty state when no submissions', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('No submissions found')).toBeInTheDocument();
        });
    });

    it('renders submissions table when data exists', async () => {
        mockGetMySubmissions.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'postgres-prod',
                database_name: 'users',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users',
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
            expect(screen.getByText('postgres-prod')).toBeInTheDocument();
        });
    });

    it('renders status filter', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('All Status')).toBeInTheDocument();
        });
    });

    it('renders POD filter', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('All PODs')).toBeInTheDocument();
        });
    });

    it('renders submission type filter', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('All Types')).toBeInTheDocument();
        });
    });

    it('handles filter change', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(mockGetMySubmissions).toHaveBeenCalled();
        });

        const statusSelect = screen.getByDisplayValue('All Status');
        fireEvent.change(statusSelect, { target: { name: 'status', value: 'APPROVED' } });

        await waitFor(() => {
            expect(mockGetMySubmissions).toHaveBeenCalledWith(expect.objectContaining({
                status: 'APPROVED'
            }));
        });
    });

    it('handles clone action', async () => {
        mockGetMySubmissions.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'test-instance',
                database_name: 'test-db',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                pod_name: 'pod-1',
                status: 'EXECUTED',
                comments: 'Test comment',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
        });

        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByTitle('Clone & Resubmit')).toBeInTheDocument();
    });

    it('opens modal when view button is clicked', async () => {
        mockGetMySubmissions.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'test',
                database_name: 'db',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
        });

        const viewButton = screen.getByTitle('View Details');
        fireEvent.click(viewButton);

        expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('handles API error gracefully', async () => {
        mockGetMySubmissions.mockRejectedValue(new Error('API Error'));

        render(<MySubmissions />);

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.error).toHaveBeenCalledWith('Failed to load submissions');
        });
    });

    it('renders script type correctly', async () => {
        mockGetMySubmissions.mockResolvedValue({
            requests: [{
                id: 2,
                instance_name: 'mongo-prod',
                database_name: 'analytics',
                db_type: 'MONGODB',
                submission_type: 'SCRIPT',
                query_content: null,
                pod_name: 'pod-1',
                status: 'PENDING',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('Script')).toBeInTheDocument();
        });
    });

    it('handles date filter auto-fill and validation', async () => {
        render(<MySubmissions />);

        await waitFor(() => {
            expect(mockGetMySubmissions).toHaveBeenCalled();
        });

        // Test: Setting start date auto-sets end date to today if empty
        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-01-01' } });

        // Wait for state update
        await waitFor(() => {
            const today = new Date().toISOString().split('T')[0];
            expect(endDateInput.value).toBe(today);
        });

        // Test: Setting end date auto-sets start date if empty
        // First reset
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '' } });
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '' } });

        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-15' } });

        await waitFor(() => {
            expect(startDateInput.value).toBe('2020-10-01');
        });

        // Test: Start date > End date validation
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-10' } });
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-01-20' } });

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.warning).toHaveBeenCalledWith('Start date cannot be after end date. End date adjusted.');
            expect(endDateInput.value).toBe('2024-01-20');
        });

        // Test: End date < Start date validation
        fireEvent.change(startDateInput, { target: { name: 'start_date', value: '2024-02-01' } });
        fireEvent.change(endDateInput, { target: { name: 'end_date', value: '2024-01-01' } });

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.warning).toHaveBeenCalledWith('End date cannot be before start date. Start date adjusted.');
            expect(startDateInput.value).toBe('2024-01-01');
        });
    });

    it('validates script cloning restrictions', async () => {
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 35); // 35 days ago to be safe

        mockGetMySubmissions.mockResolvedValue({
            requests: [
                {
                    id: 1,
                    instance_name: 'test',
                    database_name: 'db',
                    db_type: 'MONGODB',
                    submission_type: 'SCRIPT',
                    status: 'FAILED',
                    created_at: '2024-01-15T10:00:00Z',
                    script_path: 'http://example.com/script.js'
                },
                {
                    id: 2,
                    instance_name: 'test',
                    database_name: 'db',
                    db_type: 'MONGODB',
                    submission_type: 'SCRIPT',
                    status: 'EXECUTED',
                    created_at: expiredDate.toISOString(),
                    script_path: 'http://example.com/expired.js'
                },
                {
                    id: 3,
                    instance_name: 'test',
                    database_name: 'db',
                    db_type: 'MONGODB',
                    submission_type: 'SCRIPT',
                    status: 'EXECUTED',
                    created_at: new Date().toISOString(),
                    script_path: 'http://example.com/valid.js'
                }
            ],
            page: 1,
            pages: 1,
            total: 3
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
        });

        // 1. Try to clone FAILED script
        const rows = screen.getAllByRole('row');
        // rows[0] is header, rows[1] is #1
        const failedRow = rows[1];
        expect(failedRow).toHaveTextContent('#1');
        const cloneBtns1 = failedRow.querySelectorAll('button[title="Clone & Resubmit"]');
        expect(cloneBtns1.length).toBe(0);

        // 2. Try to clone EXPIRED script (ID 2)
        const expiredRow = rows[2];
        expect(expiredRow).toHaveTextContent('#2');
        const cloneBtn2 = expiredRow.querySelector('button[title="Clone & Resubmit"]');
        expect(cloneBtn2).toBeInTheDocument();

        fireEvent.click(cloneBtn2);

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('script has expired'));
        });

        // 3. Clone VALID script (ID 3)
        const validRow = rows[3];
        expect(validRow).toHaveTextContent('#3');
        const cloneBtn3 = validRow.querySelector('button[title="Clone & Resubmit"]');

        fireEvent.click(cloneBtn3);
        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('Script cloned'));
            expect(mockNavigate).toHaveBeenCalledWith('/submit');
        });

        // Verify session storage
        expect(sessionStorage.getItem('cloneRequest')).toContain('http://example.com/valid.js');
    });

    it('handles successful query cloning', async () => {
        mockGetMySubmissions.mockResolvedValue({
            requests: [{
                id: 1,
                instance_name: 'pg-prod',
                database_name: 'users',
                db_type: 'POSTGRESQL',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users',
                status: 'EXECUTED',
                comments: 'Test query',
                pod_name: 'pod-1',
                created_at: '2024-01-15T10:00:00Z'
            }],
            page: 1,
            pages: 1,
            total: 1
        });

        render(<MySubmissions />);

        await waitFor(() => {
            expect(screen.getByText('#1')).toBeInTheDocument();
        });

        const cloneButton = screen.getByTitle('Clone & Resubmit');
        fireEvent.click(cloneButton);

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.info).toHaveBeenCalledWith('Query cloned. You can modify and resubmit.');
            expect(mockNavigate).toHaveBeenCalledWith('/submit');
        });

        const storedData = JSON.parse(sessionStorage.getItem('cloneRequest'));
        expect(storedData).toEqual({
            instance_name: 'pg-prod',
            database_name: 'users',
            submission_type: 'QUERY',
            query_content: 'SELECT * FROM users',
            comments: 'Test query',
            pod_name: 'pod-1',
            script_path: undefined
        });
    });

    it('handles pagination', async () => {
        // Mock API to return pagination data
        mockGetMySubmissions.mockResolvedValue({
            requests: [],
            page: 1,
            pages: 2,
            total: 15
        });

        render(<MySubmissions />);

        await waitFor(() => {
            const page1Btn = screen.getByLabelText('Page 1');
            expect(page1Btn).toHaveClass('active');
        });

        // Click next page
        const nextButton = screen.getByLabelText('Next Page');
        fireEvent.click(nextButton);

        await waitFor(() => {
            expect(mockGetMySubmissions).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
        });
    });

    it('handles pod loading failure', async () => {
        // Suppress console error for this test
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        mockGetPods.mockRejectedValue(new Error('Failed to load pods'));

        render(<MySubmissions />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to load pods');
        });

        consoleSpy.mockRestore();
    });
});
