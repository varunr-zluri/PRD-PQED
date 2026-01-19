import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
    const defaultProps = {
        onFileSelect: jest.fn(),
        onClear: jest.fn(),
        file: null
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Upload Zone (no file selected)', () => {
        it('renders upload zone when no file is selected', () => {
            render(<FileUpload {...defaultProps} />);

            expect(screen.getByText(/Click to upload/)).toBeInTheDocument();
            expect(screen.getByText(/JavaScript files \(.js\) only/)).toBeInTheDocument();
        });

        it('triggers file input when zone is clicked', () => {
            render(<FileUpload {...defaultProps} />);

            const zone = document.querySelector('.file-upload-zone');
            fireEvent.click(zone);

            // File input should be in the document
            const input = document.querySelector('input[type="file"]');
            expect(input).toBeInTheDocument();
        });

        it('uses default accept prop', () => {
            render(<FileUpload {...defaultProps} />);

            const input = document.querySelector('input[type="file"]');
            expect(input).toHaveAttribute('accept', '.js');
        });

        it('uses custom accept prop', () => {
            render(<FileUpload {...defaultProps} accept=".ts" />);

            const input = document.querySelector('input[type="file"]');
            expect(input).toHaveAttribute('accept', '.ts');
        });

        it('calls onFileSelect when file is chosen via input', () => {
            render(<FileUpload {...defaultProps} />);

            const input = document.querySelector('input[type="file"]');
            const file = new File(['console.log("test")'], 'test.js', { type: 'text/javascript' });

            fireEvent.change(input, { target: { files: [file] } });

            expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
        });

        it('adds dragging class on drag over', () => {
            render(<FileUpload {...defaultProps} />);

            const zone = document.querySelector('.file-upload-zone');
            fireEvent.dragOver(zone);

            expect(zone).toHaveClass('dragging');
        });

        it('removes dragging class on drag leave', () => {
            render(<FileUpload {...defaultProps} />);

            const zone = document.querySelector('.file-upload-zone');
            fireEvent.dragOver(zone);
            fireEvent.dragLeave(zone);

            expect(zone).not.toHaveClass('dragging');
        });

        it('calls onFileSelect on valid file drop', () => {
            render(<FileUpload {...defaultProps} />);

            const zone = document.querySelector('.file-upload-zone');
            const file = new File(['code'], 'script.js', { type: 'text/javascript' });

            fireEvent.drop(zone, {
                dataTransfer: { files: [file] }
            });

            expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file);
        });

        it('does not call onFileSelect on invalid file drop', () => {
            render(<FileUpload {...defaultProps} />);

            const zone = document.querySelector('.file-upload-zone');
            const file = new File(['data'], 'data.txt', { type: 'text/plain' });

            fireEvent.drop(zone, {
                dataTransfer: { files: [file] }
            });

            expect(defaultProps.onFileSelect).not.toHaveBeenCalled();
        });
    });

    describe('File Preview (file selected)', () => {
        const testFile = new File(['console.log("test")'], 'script.js', { type: 'text/javascript' });
        Object.defineProperty(testFile, 'size', { value: 2048 });

        it('renders file preview when file is selected', () => {
            render(<FileUpload {...defaultProps} file={testFile} />);

            expect(screen.getByText('script.js')).toBeInTheDocument();
        });

        it('displays file size correctly', () => {
            render(<FileUpload {...defaultProps} file={testFile} />);

            expect(screen.getByText('2.0 KB')).toBeInTheDocument();
        });

        it('calls onClear when remove button is clicked', () => {
            render(<FileUpload {...defaultProps} file={testFile} />);

            const removeButton = screen.getByRole('button');
            fireEvent.click(removeButton);

            expect(defaultProps.onClear).toHaveBeenCalled();
        });
    });
});
