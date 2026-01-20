import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Protected Route Wrapper
 * Redirects to login if not authenticated, shows loading during auth check
 */
export const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: '12px'
            }}>
                <span className="spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
};

/**
 * Manager Route Wrapper
 * Redirects to home if user is not a manager
 */
export const ManagerRoute = ({ children }) => {
    const { user } = useAuth();
    if (user?.role !== 'MANAGER') {
        return <Navigate to="/" />;
    }
    return children;
};
