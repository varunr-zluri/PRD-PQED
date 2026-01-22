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
        jest.resetAllMocks();
        mockGetInstances.mockResolvedValue(mockInstances);
        mockGetPods.mockResolvedValue(mockPods);
        mockGetDatabases.mockResolvedValue(['users', 'orders']);
        mockSubmitRequest.mockResolvedValue({ success: true });
        sessionStorage.clear();
    });

    it('loads initial data correctly', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        const instanceSelect = screen.getByLabelText(/Instance Name/i);
        expect(instanceSelect).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole('option', { name: /postgres-prod/i })).toBeInTheDocument();
        });
    });

    it('validates required fields', async () => {
        render(<SubmitRequest />);

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

        // Wait for instance option
        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        // Wait for databases to load
        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Please upload a script file');
        });
    });

    it('submits successfully', async () => {
        render(<SubmitRequest />);

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());
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

    it('validates empty query content', async () => {
        render(<SubmitRequest />);

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        // Wait for databases to load
        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Please enter a query');
        });
    });

    it('validates empty comments', async () => {
        render(<SubmitRequest />);

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });
        fireEvent.change(screen.getByLabelText(/SQL\/MongoDB Query/i), { target: { value: 'SELECT 1' } });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Please add a comment describing your request');
        });
    });

    it('submits cloned script without new file', async () => {
        const clonedData = {
            instance_name: 'postgres-prod',
            database_name: 'users',
            submission_type: 'SCRIPT',
            script_path: 'http://example.com/script.js',
            comments: 'Cloned'
        };
        sessionStorage.setItem('cloneRequest', JSON.stringify(clonedData));

        render(<SubmitRequest />);

        await waitFor(() => {
            expect(screen.getByText(/Cloned from previous script/i)).toBeInTheDocument();
        });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(mockSubmitRequest).toHaveBeenCalledWith(expect.any(FormData));
            const formData = mockSubmitRequest.mock.calls[0][0];
            expect(formData.get('submission_type')).toBe('SCRIPT');
            expect(formData.get('cloned_script_path')).toBe('http://example.com/script.js');
            expect(formData.get('script_file')).toBeNull();
        });
    });

    it('clears selected file', async () => {
        render(<SubmitRequest />);

        fireEvent.click(screen.getByLabelText('Script'));

        const file = new File(['test'], 'test.js', { type: 'text/javascript' });
        const fileInput = screen.getByTestId('file-input');
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(screen.getByText('File: test.js')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Clear'));

        await waitFor(() => {
            expect(screen.getByText('No file')).toBeInTheDocument();
        });
    });

    it('handles submission error from API', async () => {
        render(<SubmitRequest />);

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });
        fireEvent.change(screen.getByLabelText(/SQL\/MongoDB Query/i), { target: { value: 'SELECT 1' } });
        fireEvent.change(screen.getByLabelText(/Comments/i), { target: { value: 'Test' } });

        mockSubmitRequest.mockRejectedValue({ response: { data: { error: 'API Error' } } });

        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('API Error');
        });
    });

    it('loads cloned request data', async () => {
        const clonedData = {
            instance_name: 'postgres-prod',
            database_name: 'users',
            submission_type: 'SCRIPT',
            script_path: 'http://example.com/script.js',
            comments: 'Cloned comment'
        };
        sessionStorage.setItem('cloneRequest', JSON.stringify(clonedData));

        render(<SubmitRequest />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Instance Name/i)).toHaveValue('postgres-prod');
            expect(screen.getByLabelText(/Database Name/i)).toHaveValue('users');
            expect(screen.getByDisplayValue('Cloned comment')).toBeInTheDocument();
            expect(screen.getByText(/Cloned from previous script/i)).toBeInTheDocument();
        });
    });

    it('handles database fetch failure', async () => {
        mockGetDatabases.mockRejectedValue(new Error('Fetch failed'));

        render(<SubmitRequest />);

        // Wait for instances to load
        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await waitFor(() => {
            // Note: we don't verify mockGetDatabases call here to rely on toast appearance
            expect(toast.error).toHaveBeenCalledWith('Failed to load databases');
        });
    });

    it('handles initial data load failure', async () => {
        mockGetInstances.mockRejectedValue(new Error('Load failed'));
        render(<SubmitRequest />);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load form data');
        });
    });

    it('handles form reset', async () => {
        render(<SubmitRequest />);

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });
        fireEvent.change(screen.getByLabelText(/Comments/i), { target: { value: 'Test comment' } });

        const resetBtn = screen.getByText('Reset');
        fireEvent.click(resetBtn);

        await waitFor(() => {
            expect(screen.getByLabelText(/Instance Name/i)).toHaveValue('');
        });
    });

    it('handles correct submission logic', async () => {
        // Test script submission with file upload
        render(<SubmitRequest />);

        await waitFor(() => screen.getByLabelText('Script'));
        fireEvent.click(screen.getByLabelText('Script'));

        const file = new File(['console.log("test")'], 'test.js', { type: 'text/javascript' });
        const fileInput = screen.getByTestId('file-input');
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(screen.getByText(/postgres-prod/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Instance Name/i), { target: { value: 'postgres-prod' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'users' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Database Name/i), { target: { value: 'users' } });
        fireEvent.change(screen.getByLabelText(/Comments/i), { target: { value: 'New Script' } });

        mockSubmitRequest.mockResolvedValue({ success: true });
        fireEvent.submit(screen.getByTestId('request-form'));

        await waitFor(() => {
            expect(mockSubmitRequest).toHaveBeenCalledWith(expect.any(FormData));
            const formData = mockSubmitRequest.mock.calls[0][0];
            expect(formData.get('submission_type')).toBe('SCRIPT');
            expect(formData.get('script_file')).toBeTruthy();
        });
    });
});
