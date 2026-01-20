import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Validate token and get user details
                    const response = await api.get('/auth/me');
                    setUser(response.data);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (identifier, password) => {
        try {
            // Determine if identifier is email or username
            const isEmail = identifier.includes('@');
            const loginData = isEmail
                ? { email: identifier, password }
                : { username: identifier, password };

            const response = await api.post('/auth/login', loginData);
            const { token, user: userData } = response.data;

            localStorage.setItem('token', token);
            setUser(userData);
            toast.success('Login successful');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.error || 'Login failed');
            return false;
        }
    };

    const signup = async (data) => {
        try {
            const response = await api.post('/auth/signup', data);
            toast.success('Signup successful. Please login.');
            return true;
        } catch (error) {
            console.error('Signup error:', error);
            toast.error(error.response?.data?.error || 'Signup failed');
            return false;
        }
    }

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        toast.info('Logged out');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
