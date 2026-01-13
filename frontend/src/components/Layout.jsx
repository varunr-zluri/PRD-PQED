import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{
                marginLeft: '260px',
                flex: 1,
                padding: '32px',
                backgroundColor: 'var(--bg-light)',
                minHeight: '100vh'
            }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
