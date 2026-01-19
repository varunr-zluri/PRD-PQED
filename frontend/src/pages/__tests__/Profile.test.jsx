import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../Profile';

const mockPatch = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { name: 'Test User', email: 'test@example.com', username: 'testuser', role: 'DEVELOPER' }
    })
}));

jest.mock('../../api/client', () => ({
    patch: (...args) => mockPatch(...args)
}));

jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    }
}));

import { toast } from 'react-toastify';

describe('Profile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders profile settings page', () => {
        render(<Profile />);

        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByText('Update your account information')).toBeInTheDocument();
    });

    it('renders email field as disabled', () => {
        render(<Profile />);

        const emailInput = screen.getByDisplayValue('test@example.com');
        expect(emailInput).toBeDisabled();
    });

    it('displays user name in form', () => {
        render(<Profile />);

        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    it('displays username in form', () => {
        render(<Profile />);

        expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    });

    it('renders password fields', () => {
        render(<Profile />);

        expect(screen.getByPlaceholderText('Leave empty to keep current')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    });

    it('renders save button', () => {
        render(<Profile />);

        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('updates name field on change', () => {
        render(<Profile />);

        const input = screen.getByDisplayValue('Test User');
        fireEvent.change(input, { target: { name: 'name', value: 'New Name' } });

        expect(input).toHaveValue('New Name');
    });

    it('updates username field on change', () => {
        render(<Profile />);

        const input = screen.getByDisplayValue('testuser');
        fireEvent.change(input, { target: { name: 'username', value: 'newuser' } });

        expect(input).toHaveValue('newuser');
    });

    it('updates password field on change', () => {
        render(<Profile />);

        const input = screen.getByPlaceholderText('Leave empty to keep current');
        fireEvent.change(input, { target: { name: 'password', value: 'newpass' } });

        expect(input).toHaveValue('newpass');
    });

    it('shows error when passwords do not match', async () => {
        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText('Leave empty to keep current'), {
            target: { name: 'password', value: 'newpass' }
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
            target: { name: 'confirmPassword', value: 'different' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Passwords do not match');
        });
    });

    it('shows info when no changes made', async () => {
        render(<Profile />);

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.info).toHaveBeenCalledWith('No changes to save');
        });
    });

    it('saves profile changes successfully', async () => {
        mockPatch.mockResolvedValue({ data: { message: 'Success' } });
        render(<Profile />);

        fireEvent.change(screen.getByDisplayValue('Test User'), {
            target: { name: 'name', value: 'Updated Name' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockPatch).toHaveBeenCalledWith('/auth/profile', { name: 'Updated Name' });
            expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
        });
    });

    it('handles profile update error', async () => {
        mockPatch.mockRejectedValue({
            response: { data: { error: 'Update failed' } }
        });
        render(<Profile />);

        fireEvent.change(screen.getByDisplayValue('Test User'), {
            target: { name: 'name', value: 'Updated Name' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Update failed');
        });
    });

    it('includes password in update when provided', async () => {
        mockPatch.mockResolvedValue({ data: { message: 'Success' } });
        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText('Leave empty to keep current'), {
            target: { name: 'password', value: 'newpassword' }
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
            target: { name: 'confirmPassword', value: 'newpassword' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(mockPatch).toHaveBeenCalledWith('/auth/profile', { password: 'newpassword' });
        });
    });

    it('shows loading state during save', async () => {
        mockPatch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100)));
        render(<Profile />);

        fireEvent.change(screen.getByDisplayValue('Test User'), {
            target: { name: 'name', value: 'Updated Name' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument();
        });
    });
});
