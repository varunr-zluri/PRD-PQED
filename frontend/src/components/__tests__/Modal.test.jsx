import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn(),
        title: 'Test Modal',
        children: <p>Modal content</p>
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing when isOpen is false', () => {
        render(<Modal {...defaultProps} isOpen={false} />);

        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
        render(<Modal {...defaultProps} />);

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('displays the title correctly', () => {
        render(<Modal {...defaultProps} title="Custom Title" />);

        expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders children content', () => {
        render(
            <Modal {...defaultProps}>
                <div data-testid="custom-content">Custom Content</div>
            </Modal>
        );

        expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
        const footer = <button>Save</button>;
        render(<Modal {...defaultProps} footer={footer} />);

        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('does not render footer when not provided', () => {
        render(<Modal {...defaultProps} />);

        expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        render(<Modal {...defaultProps} />);

        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
        render(<Modal {...defaultProps} />);

        const overlay = document.querySelector('.modal-overlay');
        fireEvent.click(overlay);

        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not call onClose when modal content is clicked', () => {
        render(<Modal {...defaultProps} />);

        const modalContent = document.querySelector('.modal-content');
        fireEvent.click(modalContent);

        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('applies lg size class when size is lg', () => {
        render(<Modal {...defaultProps} size="lg" />);

        const modalContent = document.querySelector('.modal-content');
        expect(modalContent).toHaveClass('modal-lg');
    });

    it('applies default size when size is md', () => {
        render(<Modal {...defaultProps} size="md" />);

        const modalContent = document.querySelector('.modal-content');
        expect(modalContent).not.toHaveClass('modal-lg');
    });
});
