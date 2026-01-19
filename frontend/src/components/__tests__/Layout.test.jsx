import { render, screen } from '@testing-library/react';
import Layout from '../Layout';

// Mock Sidebar
jest.mock('../Sidebar', () => {
    return function MockSidebar() {
        return <div data-testid="sidebar">Sidebar</div>;
    };
});

// Mock react-router-dom Outlet
jest.mock('react-router-dom', () => ({
    Outlet: () => <div data-testid="outlet">Outlet Content</div>
}));

describe('Layout', () => {
    it('renders Sidebar', () => {
        render(<Layout />);

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders Outlet for child routes', () => {
        render(<Layout />);

        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('has correct layout structure', () => {
        const { container } = render(<Layout />);

        const wrapper = container.firstChild;
        expect(wrapper).toHaveStyle({ display: 'flex' });
    });

    it('renders main content area', () => {
        render(<Layout />);

        const main = document.querySelector('main');
        expect(main).toBeInTheDocument();
        expect(main).toHaveStyle({ marginLeft: '260px' });
    });
});
