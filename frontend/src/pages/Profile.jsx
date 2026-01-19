import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { User, AtSign, Lock, Save } from 'lucide-react';
import api from '../api/client';

const Profile = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate password match
        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const updateData = {};
            if (formData.name !== user?.name) updateData.name = formData.name;
            if (formData.username !== user?.username) updateData.username = formData.username;
            if (formData.password) updateData.password = formData.password;

            if (Object.keys(updateData).length === 0) {
                toast.info('No changes to save');
                setLoading(false);
                return;
            }

            await api.patch('/auth/profile', updateData);
            toast.success('Profile updated successfully');

            // Clear password fields
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        }
        setLoading(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Profile Settings</h1>
                <p className="page-subtitle">Update your account information</p>
            </div>

            <div className="card" style={{ maxWidth: '500px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="label">Email</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="email"
                                className="input"
                                value={user?.email || ''}
                                disabled
                                style={{ width: '100%', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>
                        <span className="text-sm text-gray">Email cannot be changed</span>
                    </div>

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
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Username</label>
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
                        <span className="text-sm text-gray">Used for login (min 3 characters)</span>
                    </div>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Change Password</h3>

                    <div className="input-group">
                        <label className="label">New Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="password"
                                name="password"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="Leave empty to keep current"
                                value={formData.password}
                                onChange={handleChange}
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="label">Confirm New Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="password"
                                name="confirmPassword"
                                className="input"
                                style={{ paddingLeft: '40px', width: '100%' }}
                                placeholder="Confirm new password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                minLength={6}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                        disabled={loading}
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;
