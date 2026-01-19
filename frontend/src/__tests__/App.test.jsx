import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock react-router-dom completely
jest.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }) => <div data-testid="routes">{children}</div>,
    Route: () => null,
    Navigate: () => null,
    Outlet: () => null
}));

// Mock ToastContainer
jest.mock('react-toastify', () => ({
    ToastContainer: () => <div data-testid="toast-container" />
}));

// Mock all page components
jest.mock('../pages/Login', () => () => <div>Login</div>);
jest.mock('../pages/Signup', () => () => <div>Signup</div>);
jest.mock('../pages/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('../pages/SubmitRequest', () => () => <div>Submit</div>);
jest.mock('../pages/ApprovalDashboard', () => () => <div>Approval</div>);
jest.mock('../pages/MySubmissions', () => () => <div>Submissions</div>);
jest.mock('../pages/Profile', () => () => <div>Profile</div>);
jest.mock('../components/Layout', () => () => <div>Layout</div>);

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
    AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
    useAuth: () => ({ user: null, loading: false })
}));

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        expect(screen.getByTestId('router')).toBeInTheDocument();
    });

    it('renders toast container', () => {
        render(<App />);
        expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    });

    it('wraps content in AuthProvider', () => {
        render(<App />);
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    });

    it('renders routes', () => {
        render(<App />);
        expect(screen.getByTestId('routes')).toBeInTheDocument();
    });
});
