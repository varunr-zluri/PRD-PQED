import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
    it('renders PENDING status correctly', () => {
        render(<StatusBadge status="PENDING" />);

        const badge = screen.getByText('Pending');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ backgroundColor: '#fef3c7' });
    });

    it('renders APPROVED status correctly', () => {
        render(<StatusBadge status="APPROVED" />);

        const badge = screen.getByText('Approved');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ backgroundColor: '#dbeafe' });
    });

    it('renders EXECUTED status correctly', () => {
        render(<StatusBadge status="EXECUTED" />);

        const badge = screen.getByText('Executed');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ backgroundColor: '#d1fae5' });
    });

    it('renders FAILED status correctly', () => {
        render(<StatusBadge status="FAILED" />);

        const badge = screen.getByText('Failed');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ backgroundColor: '#fee2e2' });
    });

    it('renders REJECTED status correctly', () => {
        render(<StatusBadge status="REJECTED" />);

        const badge = screen.getByText('Rejected');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveStyle({ backgroundColor: '#fecaca' });
    });

    it('renders SUCCESS status correctly', () => {
        render(<StatusBadge status="SUCCESS" />);

        const badge = screen.getByText('Success');
        expect(badge).toBeInTheDocument();
    });

    it('renders FAILURE status correctly', () => {
        render(<StatusBadge status="FAILURE" />);

        const badge = screen.getByText('Failure');
        expect(badge).toBeInTheDocument();
    });

    it('defaults to PENDING style for unknown status', () => {
        render(<StatusBadge status="UNKNOWN" />);

        const badge = screen.getByText('Pending');
        expect(badge).toBeInTheDocument();
    });

    it('applies status-badge class', () => {
        render(<StatusBadge status="PENDING" />);

        const badge = screen.getByText('Pending');
        expect(badge).toHaveClass('status-badge');
    });
});
