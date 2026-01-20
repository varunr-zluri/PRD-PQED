import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SubmitRequest from '../SubmitRequest';

// Mock API client
const mockGetInstances = jest.fn();
const mockGetDatabases = jest.fn();
const mockGetPods = jest.fn();
const mockSubmitRequest = jest.fn();

jest.mock('../../api/client', () => ({
    getInstances: (...args) => mockGetInstances(...args),
    getDatabases: (...args) => mockGetDatabases(...args),
    getPods: (...args) => mockGetPods(...args),
    submitRequest: (...args) => mockSubmitRequest(...args)
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { name: 'Test User', pod_name: 'pod-1' }
    })
}));

jest.mock('react-toastify', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
        info: jest.fn()
    }
}));

import { toast } from 'react-toastify';

// Mock FileUpload
jest.mock('../../components/FileUpload', () => {
    return function MockFileUpload({ onFileSelect, onClear, file }) {
        return (
            <div data-testid="file-upload">
                {file ? <span>File: {file.name}</span> : <span>No file</span>}
                <input
                    type="file"
                    data-testid="file-input"
                    onChange={(e) => onFileSelect(e.target.files[0])}
                />
                <button onClick={onClear}>Clear</button>
            </div>
        );
    };
});

describe('SubmitRequest', () => {
    const mockInstances = [
        { name: 'postgres-prod', type: 'POSTGRESQL' },
        { name: 'mongo-dev', type: 'MONGODB' }
    ];
    const mockPods = [
        { pod_name: 'pod-1', display_name: 'Pod 1' },
        { pod_name: 'pod-2', display_name: 'Pod 2' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInstances.mockResolvedValue(mockInstances);
        mockGetPods.mockResolvedValue(mockPods);
        mockGetDatabases.mockResolvedValue(['users', 'orders']);
        sessionStorage.clear();
    });

    it('loads initial data correctly', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });
        expect(screen.getByText('postgres-prod (POSTGRESQL)')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
        render(<SubmitRequest />);

        const submitBtn = screen.getByText('Submit Request');

        // Use fireEvent.submit directly
        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Please select instance and database');
        });
    });

    it('validates submission type switch', async () => {
        render(<SubmitRequest />);

        // Click label to trigger change
        fireEvent.click(screen.getByLabelText('Script'));

        await waitFor(() => {
            expect(screen.getByTestId('file-upload')).toBeInTheDocument();
        });
    });

    it('validates script file requirement', async () => {
        render(<SubmitRequest />);

        fireEvent.click(screen.getByLabelText('Script'));
        await waitFor(() => expect(screen.getByTestId('file-upload')).toBeInTheDocument());

        // Fill other fields
        await waitFor(() => screen.getByText('postgres-prod (POSTGRESQL)'));
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await screen.findByText('users');
        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Please upload a script file');
        });
    });

    it('submits successfully', async () => {
        render(<SubmitRequest />);

        await waitFor(() => screen.getByText('postgres-prod (POSTGRESQL)'));
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await screen.findByText('users');
        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });

        fireEvent.change(screen.getByLabelText(/SQL\/MongoDB Query/i), { target: { value: 'SELECT 1' } });
        fireEvent.change(screen.getByLabelText(/Comments/i), { target: { value: 'Test' } });

        mockSubmitRequest.mockResolvedValue({ success: true });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(mockSubmitRequest).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalled();
        });
    });
});
