import { useState, useRef } from 'react';
import { Upload, X, FileCode } from 'lucide-react';

const FileUpload = ({ onFileSelect, accept = '.js', file, onClear }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.name.endsWith('.js')) {
            onFileSelect(droppedFile);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            onFileSelect(selectedFile);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    if (file) {
        return (
            <div className="file-upload-preview">
                <div className="file-info">
                    <FileCode size={24} className="file-icon" />
                    <div>
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                </div>
                <button
                    type="button"
                    className="file-remove"
                    onClick={onClear}
                >
                    <X size={18} />
                </button>
            </div>
        );
    }

    return (
        <div
            className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <Upload size={32} className="upload-icon" />
            <p className="upload-text">
                <span className="upload-link">Click to upload</span> or drag and drop
            </p>
            <p className="upload-hint">JavaScript files (.js) only</p>
        </div>
    );
};

export default FileUpload;
