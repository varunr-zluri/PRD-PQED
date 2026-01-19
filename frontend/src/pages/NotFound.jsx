import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            // Redirect based on authentication status
            if (user) {
                // Authenticated user -> go to dashboard
                navigate('/', { replace: true });
            } else {
                // Unauthenticated user -> go to login
                navigate('/login', { replace: true });
            }
        }
    }, [user, loading, navigate]);

    // Show loading spinner while checking auth
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-main)',
            color: 'white'
        }}>
            <span className="spinner" />
            <span style={{ marginLeft: '12px' }}>Redirecting...</span>
        </div>
    );
};

export default NotFound;
