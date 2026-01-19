import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Signup from '../Signup';

const mockSignup = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate
}));

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        signup: mockSignup
    })
}));

describe('Signup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders signup form', () => {
        render(<Signup />);

        expect(screen.getByText('Create Account')).toBeInTheDocument();
        expect(screen.getByText('Join Zluri SRE Portal')).toBeInTheDocument();
    });

    it('renders Z logo', () => {
        render(<Signup />);

        expect(screen.getByText('Z')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
        render(<Signup />);

        expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('johndoe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('name@zluri.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('renders POD dropdown', () => {
        render(<Signup />);

        expect(screen.getByText('Pod 1')).toBeInTheDocument();
    });

    it('renders submit button', () => {
        render(<Signup />);

        expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
    });

    it('renders login link', () => {
        render(<Signup />);

        expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('updates name field on change', () => {
        render(<Signup />);

        const input = screen.getByPlaceholderText('John Doe');
        fireEvent.change(input, { target: { name: 'name', value: 'Test Name' } });

        expect(input).toHaveValue('Test Name');
    });

    it('updates username field on change', () => {
        render(<Signup />);

        const input = screen.getByPlaceholderText('johndoe');
        fireEvent.change(input, { target: { name: 'username', value: 'testuser' } });

        expect(input).toHaveValue('testuser');
    });

    it('updates email field on change', () => {
        render(<Signup />);

        const input = screen.getByPlaceholderText('name@zluri.com');
        fireEvent.change(input, { target: { name: 'email', value: 'test@example.com' } });

        expect(input).toHaveValue('test@example.com');
    });

    it('updates password field on change', () => {
        render(<Signup />);

        const input = screen.getByPlaceholderText('••••••••');
        fireEvent.change(input, { target: { name: 'password', value: 'password123' } });

        expect(input).toHaveValue('password123');
    });

    it('updates pod_name field on change', () => {
        render(<Signup />);

        const select = screen.getByDisplayValue('Pod 1');
        fireEvent.change(select, { target: { name: 'pod_name', value: 'pod-2' } });

        expect(select).toHaveValue('pod-2');
    });

    it('calls signup on form submit', async () => {
        mockSignup.mockResolvedValue(true);
        render(<Signup />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { name: 'name', value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('name@zluri.com'), { target: { name: 'email', value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { name: 'password', value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalled();
        });
    });

    it('navigates to login on successful signup', async () => {
        mockSignup.mockResolvedValue(true);
        render(<Signup />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { name: 'name', value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('name@zluri.com'), { target: { name: 'email', value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { name: 'password', value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('does not navigate on failed signup', async () => {
        mockSignup.mockResolvedValue(false);
        render(<Signup />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { name: 'name', value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('name@zluri.com'), { target: { name: 'email', value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { name: 'password', value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

        await waitFor(() => {
            expect(mockSignup).toHaveBeenCalled();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows loading state during signup', async () => {
        mockSignup.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
        render(<Signup />);

        fireEvent.change(screen.getByPlaceholderText('John Doe'), { target: { name: 'name', value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('name@zluri.com'), { target: { name: 'email', value: 'test@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { name: 'password', value: 'pass123' } });

        fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

        await waitFor(() => {
            expect(screen.getByText('Creating Account...')).toBeInTheDocument();
        });
    });
});
