import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the navigate function
const mockNavigate = jest.fn();

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate
}));

// Mock the AuthContext
const mockLogin = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        user: null,
        loading: false
    })
}));

// Mock the logo import
jest.mock('../../assets/logo.svg', () => 'test-logo.svg');

// Mock react-toastify
jest.mock('react-toastify', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn()
    }
}));

// Import Login after mocks are set up
import Login from '../Login';

describe('Login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login form', () => {
        render(<Login />);

        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText('Sign in to Zluri SRE Portal')).toBeInTheDocument();
    });

    it('renders email/username input', () => {
        render(<Login />);

        expect(screen.getByPlaceholderText(/name@zluri.com or username/i)).toBeInTheDocument();
    });

    it('renders password input', () => {
        render(<Login />);

        expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
    });

    it('renders sign in button', () => {
        render(<Login />);

        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('renders sign up link', () => {
        render(<Login />);

        expect(screen.getByText(/Sign up/i)).toBeInTheDocument();
    });

    it('updates identifier field on change', () => {
        render(<Login />);

        const input = screen.getByPlaceholderText(/name@zluri.com or username/i);
        fireEvent.change(input, { target: { value: 'testuser' } });

        expect(input).toHaveValue('testuser');
    });

    it('updates password field on change', () => {
        render(<Login />);

        const input = screen.getByPlaceholderText(/••••••••/);
        fireEvent.change(input, { target: { value: 'password123' } });

        expect(input).toHaveValue('password123');
    });

    it('calls login on form submit', async () => {
        mockLogin.mockResolvedValue(true);
        render(<Login />);

        const identifierInput = screen.getByPlaceholderText(/name@zluri.com or username/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(identifierInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
        });
    });

    it('navigates to home on successful login', async () => {
        mockLogin.mockResolvedValue(true);
        render(<Login />);

        const identifierInput = screen.getByPlaceholderText(/name@zluri.com or username/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(identifierInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('does not navigate on failed login', async () => {
        mockLogin.mockResolvedValue(false);
        render(<Login />);

        const identifierInput = screen.getByPlaceholderText(/name@zluri.com or username/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(identifierInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows loading state during login', async () => {
        mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
        render(<Login />);

        const identifierInput = screen.getByPlaceholderText(/name@zluri.com or username/i);
        const passwordInput = screen.getByPlaceholderText(/••••••••/);
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(identifierInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Signing in...')).toBeInTheDocument();
        });
    });

    it('has Zluri logo', () => {
        render(<Login />);

        expect(screen.getByAltText('Zluri')).toBeInTheDocument();
    });
});
