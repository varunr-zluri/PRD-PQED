const statusStyles = {
    PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    APPROVED: { bg: '#dbeafe', color: '#1e40af', label: 'Approved' },
    EXECUTED: { bg: '#d1fae5', color: '#065f46', label: 'Executed' },
    FAILED: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
    REJECTED: { bg: '#fecaca', color: '#991b1b', label: 'Rejected' },
};

const StatusBadge = ({ status }) => {
    const style = statusStyles[status] || statusStyles.PENDING;

    return (
        <span
            className="status-badge"
            style={{
                backgroundColor: style.bg,
                color: style.color,
            }}
        >
            {style.label}
        </span>
    );
};

export default StatusBadge;
