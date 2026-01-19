import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Database, ShieldCheck, History, ArrowRight } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isManager = user?.role === 'MANAGER';

    const developerActions = [
        {
            title: 'Submit New Request',
            description: 'Submit a database query or script for approval and execution',
            icon: Database,
            path: '/submit',
            color: 'var(--primary)'
        },
        {
            title: 'My Submissions',
            description: 'View your submission history and track request status',
            icon: History,
            path: '/history',
            color: 'var(--success)'
        }
    ];

    const managerActions = [
        {
            title: 'Approval Dashboard',
            description: 'Review and approve pending query requests from your POD',
            icon: ShieldCheck,
            path: '/approvals',
            color: 'var(--primary)'
        }
    ];

    const actions = isManager ? [...managerActions, ...developerActions] : developerActions;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Welcome, {user?.name || 'User'}</h1>
                <p className="page-subtitle">
                    {isManager
                        ? 'Manage and approve database query requests for your POD'
                        : 'Submit and track database queries for execution'}
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
            }}>
                {actions.map((action) => (
                    <div
                        key={action.path}
                        className="card"
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid var(--border)'
                        }}
                        onClick={() => navigate(action.path)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = action.color;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: `${action.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <action.icon size={24} style={{ color: action.color }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{
                                    margin: '0 0 8px',
                                    fontSize: '1.125rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {action.title}
                                    <ArrowRight size={18} style={{ color: 'var(--text-secondary)' }} />
                                </h3>
                                <p style={{
                                    margin: 0,
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.9375rem'
                                }}>
                                    {action.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* User Info Card */}
            <div className="card" style={{ marginTop: '32px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>Your Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                        <div className="text-sm text-gray">Name</div>
                        <div style={{ fontWeight: 500 }}>{user?.name || '—'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray">Email</div>
                        <div style={{ fontWeight: 500 }}>{user?.email || '—'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray">Role</div>
                        <div style={{ fontWeight: 500 }}>{user?.role || '—'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray">POD</div>
                        <div style={{ fontWeight: 500 }}>{user?.pod_name || '—'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
