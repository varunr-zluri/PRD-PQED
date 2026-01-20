import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, History, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import zluriLogo from '../assets/logo.svg';
import '../index.css';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isManager = user?.role === 'MANAGER';

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'New Request', path: '/submit', icon: Database }, // Managers can now submit
        { name: 'Approval Dashboard', path: '/approvals', icon: ShieldCheck, hidden: !isManager },
        { name: 'My Submissions', path: '/history', icon: History }, // Managers can view their history
    ];

    return (
        <aside style={{
            width: '260px',
            backgroundColor: 'var(--bg-sidebar)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            position: 'fixed',
            zIndex: 50
        }}>
            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src={zluriLogo}
                    alt="Zluri"
                    style={{ height: '32px', width: 'auto' }}
                />
            </div>

            <nav style={{ flex: 1, padding: '0 12px' }}>
                {navItems.filter(item => !item.hidden).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive ? 'nav-item active' : 'nav-item'
                        }
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '4px',
                            textDecoration: 'none',
                            color: isActive ? 'white' : '#94a3b8',
                            backgroundColor: isActive ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                            transition: 'all 0.2s'
                        })}
                    >
                        <item.icon size={20} />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div
                    style={{ marginBottom: '16px', cursor: 'pointer' }}
                    onClick={() => navigate('/profile')}
                >
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {user?.username ? `@${user.username}` : user?.email}
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="btn"
                    style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        color: '#ef4444',
                        padding: '0'
                    }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;


