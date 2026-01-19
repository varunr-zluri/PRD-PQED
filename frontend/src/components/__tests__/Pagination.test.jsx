import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Pagination';

describe('Pagination', () => {
    const defaultProps = {
        currentPage: 1,
        totalPages: 5,
        onPageChange: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing when totalPages is 1', () => {
        const { container } = render(
            <Pagination {...defaultProps} totalPages={1} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when totalPages is 0', () => {
        const { container } = render(
            <Pagination {...defaultProps} totalPages={0} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders pagination when totalPages > 1', () => {
        render(<Pagination {...defaultProps} />);

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
        render(<Pagination {...defaultProps} currentPage={1} />);

        const buttons = screen.getAllByRole('button');
        const prevButton = buttons[0];

        expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
        render(<Pagination {...defaultProps} currentPage={5} />);

        const buttons = screen.getAllByRole('button');
        const nextButton = buttons[buttons.length - 1];

        expect(nextButton).toBeDisabled();
    });

    it('enables both buttons on middle page', () => {
        render(<Pagination {...defaultProps} currentPage={3} />);

        const buttons = screen.getAllByRole('button');
        const prevButton = buttons[0];
        const nextButton = buttons[buttons.length - 1];

        expect(prevButton).not.toBeDisabled();
        expect(nextButton).not.toBeDisabled();
    });

    it('calls onPageChange with previous page when prev button clicked', () => {
        render(<Pagination {...defaultProps} currentPage={3} />);

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange with next page when next button clicked', () => {
        render(<Pagination {...defaultProps} currentPage={3} />);

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[buttons.length - 1]);

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange when page number is clicked', () => {
        render(<Pagination {...defaultProps} currentPage={1} />);

        fireEvent.click(screen.getByText('3'));

        expect(defaultProps.onPageChange).toHaveBeenCalledWith(3);
    });

    it('highlights current page with active class', () => {
        render(<Pagination {...defaultProps} currentPage={3} />);

        const activeButton = screen.getByText('3');
        expect(activeButton).toHaveClass('active');
    });

    it('handles many pages correctly', () => {
        render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />);

        // Should show max 5 pages centered around current
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('adjusts page range at start', () => {
        render(<Pagination {...defaultProps} totalPages={20} currentPage={2} />);

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('adjusts page range at end', () => {
        render(<Pagination {...defaultProps} totalPages={20} currentPage={19} />);

        expect(screen.getByText('16')).toBeInTheDocument();
        expect(screen.getByText('19')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
    });
});
