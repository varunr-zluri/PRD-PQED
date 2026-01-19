import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, Layers, AtSign } from 'lucide-react';
import zluriLogo from '../assets/logo.svg';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        pod_name: 'pod-1' // Default
    });
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const success = await signup(formData);
        if (success) {
            navigate('/login');
        }
        setLoading(false);
    };

    const podOptions = [
        { value: 'pod-1', label: 'Pod 1' },
        { value: 'pod-2', label: 'Pod 2' },
        { value: 'pod-3', label: 'Pod 3' },
        { value: 'sre', label: 'SRE' },
        { value: 'de', label: 'Data Engineering' }
    ];

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
                    <img
                        src={zluriLogo}
                        alt="Zluri"
                        style={{ height: '48px', width: 'auto', margin: '0 auto 1rem' }}
                    />
                    <h1 className="text-xl font-bold">Create Account</h1>
                    <p className="text-gray">Join Zluri SRE Portal</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="label">Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                name="name"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Username <span className="text-gray" style={{ fontWeight: 'normal' }}>(optional)</span></label>
                        <div style={{ position: 'relative' }}>
                            <AtSign size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                name="username"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="johndoe"
                                value={formData.username}
                                onChange={handleChange}
                                minLength={3}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="email"
                                name="email"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="name@zluri.com"
                                value={formData.email}
                                onChange={handleChange}
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
                                name="password"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">POD Assignment</label>
                        <div style={{ position: 'relative' }}>
                            <Layers size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <select
                                name="pod_name"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%', appearance: 'none', backgroundColor: 'white' }}
                                value={formData.pod_name}
                                onChange={handleChange}
                            >
                                {podOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {/* Custom arrow could go here */}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
                    <span className="text-gray">Already have an account? </span>
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
