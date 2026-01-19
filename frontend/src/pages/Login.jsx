import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User } from 'lucide-react';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await login(identifier, password);
        if (success) {
            navigate('/');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#f1f5f9'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px', height: '48px',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '12px',
                        margin: '0 auto 1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: '1.5rem'
                    }}>Z</div>
                    <h1 className="text-xl font-bold">Welcome Back</h1>
                    <p className="text-gray">Sign in to Zluri SRE Portal</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="label">Email or Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="name@zluri.com or username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="password"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                    <span className="text-gray">Don't have an account? </span>
                    <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>Sign up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;

