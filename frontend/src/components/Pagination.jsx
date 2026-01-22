import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    return (
        <div className="pagination">
            <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Previous Page"
            >
                <ChevronLeft size={18} />
            </button>

            {getPageNumbers().map(page => (
                <button
                    key={page}
                    className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => onPageChange(page)}
                    aria-label={`Page ${page}`}
                >
                    {page}
                </button>
            ))}

            <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Next Page"
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
};

export default Pagination;
