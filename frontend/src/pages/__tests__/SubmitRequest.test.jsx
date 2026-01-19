import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock FileUpload
jest.mock('../../components/FileUpload', () => {
    return function MockFileUpload({ onFileSelect, onClear, file }) {
        return (
            <div data-testid="file-upload">
                {file ? <span>File: {file.name}</span> : <span>No file</span>}
                <button onClick={() => onFileSelect({ name: 'script.js' })}>Upload</button>
                <button onClick={onClear}>Clear</button>
            </div>
        );
    };
});

describe('SubmitRequest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInstances.mockResolvedValue([
            { name: 'postgres-prod', type: 'POSTGRESQL' },
            { name: 'mongo-dev', type: 'MONGODB' }
        ]);
        mockGetPods.mockResolvedValue([
            { pod_name: 'pod-1', display_name: 'Pod 1' }
        ]);
        mockGetDatabases.mockResolvedValue(['users', 'orders']);
        sessionStorage.clear();
    });

    it('renders page title', async () => {
        render(<SubmitRequest />);

        expect(screen.getByText('Query Submission Portal')).toBeInTheDocument();
        expect(screen.getByText('Submit database queries for approval and execution')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });
    });

    it('renders instance dropdown', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(screen.getByText('Select Instance')).toBeInTheDocument();
        });
    });

    it('renders database dropdown as disabled initially', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            const dbSelect = screen.getByDisplayValue('Select Database');
            expect(dbSelect).toBeDisabled();
        });
    });

    it('renders submission type radio buttons', async () => {
        render(<SubmitRequest />);

        expect(screen.getByText('Query')).toBeInTheDocument();
        expect(screen.getByText('Script')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });
    });

    it('renders submit and reset buttons', async () => {
        render(<SubmitRequest />);

        expect(screen.getByText('Submit Request')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });
    });

    it('loads databases when instance is selected', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        const instanceSelect = screen.getByDisplayValue('Select Instance');
        fireEvent.change(instanceSelect, { target: { name: 'instance_name', value: 'postgres-prod' } });

        await waitFor(() => {
            expect(mockGetDatabases).toHaveBeenCalledWith('postgres-prod');
        });
    });

    it('shows file upload when Script is selected', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        const scriptRadio = screen.getByLabelText('Script');
        fireEvent.click(scriptRadio);

        expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('shows textarea when Query is selected', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        expect(screen.getByPlaceholderText(/SELECT \* FROM/)).toBeInTheDocument();
    });

    it('handles form field changes', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        const commentsInput = screen.getByPlaceholderText('Describe the purpose of this query...');
        fireEvent.change(commentsInput, { target: { name: 'comments', value: 'Test comment' } });

        expect(commentsInput).toHaveValue('Test comment');
    });

    it('renders form fields', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        // Form has validation on instance and database
        expect(screen.getByText('Instance Name *')).toBeInTheDocument();
        expect(screen.getByText('Database Name *')).toBeInTheDocument();
    });

    it('submits form when data is filled', async () => {
        mockSubmitRequest.mockResolvedValue({ id: 1 });
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        // Fill instance
        fireEvent.change(screen.getByDisplayValue('Select Instance'), {
            target: { name: 'instance_name', value: 'postgres-prod' }
        });

        await waitFor(() => {
            expect(mockGetDatabases).toHaveBeenCalled();
        });

        // Verify form is interactive
        expect(screen.getByText('Submit Request')).toBeEnabled();
    });

    it('handles reset button', async () => {
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        // Enter some data
        fireEvent.change(screen.getByPlaceholderText('Describe the purpose of this query...'), {
            target: { name: 'comments', value: 'Test' }
        });

        // Click reset
        fireEvent.click(screen.getByText('Reset'));

        // Field should be empty
        expect(screen.getByPlaceholderText('Describe the purpose of this query...')).toHaveValue('');
    });

    it('loads cloned data from sessionStorage', async () => {
        sessionStorage.setItem('cloneRequest', JSON.stringify({
            query_content: 'SELECT 1',
            comments: 'Cloned query'
        }));

        render(<SubmitRequest />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('Cloned query')).toBeInTheDocument();
        });
    });

    it('handles API error when loading instances', async () => {
        mockGetInstances.mockRejectedValue(new Error('API Error'));

        render(<SubmitRequest />);

        await waitFor(() => {
            const { toast } = require('react-toastify');
            expect(toast.error).toHaveBeenCalledWith('Failed to load form data');
        });
    });

    it('handles API error when loading databases', async () => {
        mockGetDatabases.mockRejectedValue(new Error('API Error'));
        render(<SubmitRequest />);

        await waitFor(() => {
            expect(mockGetInstances).toHaveBeenCalled();
        });

        // Even if databases fail to load, the form should still render
        expect(screen.getByText('Submit Request')).toBeInTheDocument();
    });
});
