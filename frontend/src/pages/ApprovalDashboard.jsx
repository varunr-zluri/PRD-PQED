import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getRequests, approveRequest, rejectRequest, getPods } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { Search, Check, X, FileText, Eye, Inbox } from 'lucide-react';

const ApprovalDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pods, setPods] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        pod_name: '',
        search: '',
        start_date: '',
        end_date: ''
    });

    // Modal state
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalType, setModalType] = useState(null); // 'approve', 'reject', 'view'
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchRequests = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await getRequests({ ...filters, page, limit: 10 });
            setRequests(data.requests);
            setPagination({ page: data.page, pages: data.pages, total: data.total });
        } catch (error) {
            toast.error('Failed to load requests');
        }
        setLoading(false);
    }, [filters]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        const fetchPods = async () => {
            try {
                const podData = await getPods();
                setPods(podData);
            } catch (error) {
                console.error('Failed to load pods');
            }
        };
        fetchPods();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;
        setActionLoading(true);
        try {
            await approveRequest(selectedRequest.id);
            toast.success('Request approved and executed');
            setModalType(null);
            setSelectedRequest(null);
            fetchRequests(pagination.page);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve request');
        }
        setActionLoading(false);
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        setActionLoading(true);
        try {
            await rejectRequest(selectedRequest.id, rejectionReason);
            toast.success('Request rejected');
            setModalType(null);
            setSelectedRequest(null);
            setRejectionReason('');
            fetchRequests(pagination.page);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject request');
        }
        setActionLoading(false);
    };

    const openModal = (request, type) => {
        setSelectedRequest(request);
        setModalType(type);
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedRequest(null);
        setRejectionReason('');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Approval Dashboard</h1>
                <p className="page-subtitle">Review and manage pending query requests</p>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label className="label">Status</label>
                    <select
                        name="status"
                        className="select"
                        value={filters.status}
                        onChange={handleFilterChange}
                        style={{ minWidth: '140px' }}
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="EXECUTED">Executed</option>
                        <option value="FAILED">Failed</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="label">POD</label>
                    <select
                        name="pod_name"
                        className="select"
                        value={filters.pod_name}
                        onChange={handleFilterChange}
                        style={{ minWidth: '120px' }}
                    >
                        <option value="">All PODs</option>
                        {pods.map(pod => (
                            <option key={pod.id} value={pod.name}>{pod.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="label">Start Date</label>
                    <input
                        type="date"
                        name="start_date"
                        className="input"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                    />
                </div>

                <div className="filter-group">
                    <label className="label">End Date</label>
                    <input
                        type="date"
                        name="end_date"
                        className="input"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                    />
                </div>

                <div className="filter-group" style={{ flex: 1, minWidth: '200px' }}>
                    <label className="label">Search</label>
                    <div className="search-input">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            name="search"
                            className="input"
                            placeholder="Search queries..."
                            value={filters.search}
                            onChange={handleFilterChange}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div className="loading-container">
                        <span className="spinner" />
                        <span>Loading requests...</span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state">
                        <Inbox size={48} className="empty-state-icon" />
                        <p>No requests found</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Database</th>
                                    <th>Type</th>
                                    <th>Query/Script</th>
                                    <th>Requester</th>
                                    <th>POD</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td>#{req.id}</td>
                                        <td>
                                            <div>{req.instance_name}</div>
                                            <div className="text-sm text-gray">{req.database_name}</div>
                                        </td>
                                        <td>{req.db_type}</td>
                                        <td>
                                            {req.submission_type === 'QUERY' ? (
                                                <div className="query-preview">
                                                    {req.query_content?.substring(0, 50) || '—'}
                                                </div>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <FileText size={16} /> Script
                                                </span>
                                            )}
                                        </td>
                                        <td>{req.requester?.email || '—'}</td>
                                        <td>{req.pod_name}</td>
                                        <td><StatusBadge status={req.status} /></td>
                                        <td className="text-sm">{formatDate(req.created_at)}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-icon btn-secondary"
                                                    title="View Details"
                                                    onClick={() => openModal(req, 'view')}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {req.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            className="btn btn-icon btn-success"
                                                            title="Approve"
                                                            onClick={() => openModal(req, 'approve')}
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-danger"
                                                            title="Reject"
                                                            onClick={() => openModal(req, 'reject')}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={(page) => fetchRequests(page)}
            />

            {/* View Modal */}
            <Modal
                isOpen={modalType === 'view' && !!selectedRequest}
                onClose={closeModal}
                title={`Request #${selectedRequest?.id}`}
            >
                {selectedRequest && (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Database:</strong> {selectedRequest.instance_name} / {selectedRequest.database_name}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Type:</strong> {selectedRequest.db_type} ({selectedRequest.submission_type})
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Requester:</strong> {selectedRequest.requester?.email}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>POD:</strong> {selectedRequest.pod_name}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Status:</strong> <StatusBadge status={selectedRequest.status} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Comments:</strong>
                            <p style={{ margin: '8px 0', color: 'var(--text-secondary)' }}>{selectedRequest.comments}</p>
                        </div>
                        {selectedRequest.query_content && (
                            <div>
                                <strong>Query:</strong>
                                <pre style={{
                                    background: 'var(--bg-light)',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    overflow: 'auto',
                                    fontSize: '0.875rem',
                                    marginTop: '8px'
                                }}>
                                    {selectedRequest.query_content}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Approve Modal */}
            <Modal
                isOpen={modalType === 'approve' && !!selectedRequest}
                onClose={closeModal}
                title="Confirm Approval"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={handleApprove}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Approve & Execute'}
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to approve and execute this request?</p>
                {selectedRequest && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-light)', borderRadius: '6px' }}>
                        <strong>Request #{selectedRequest.id}</strong>
                        <p className="text-sm text-gray">{selectedRequest.comments}</p>
                    </div>
                )}
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={modalType === 'reject' && !!selectedRequest}
                onClose={closeModal}
                title="Reject Request"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleReject}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Reject Request'}
                        </button>
                    </>
                }
            >
                <p>Please provide a reason for rejection (optional):</p>
                <textarea
                    className="textarea"
                    placeholder="Rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{ width: '100%', marginTop: '12px' }}
                />
            </Modal>
        </div>
    );
};

export default ApprovalDashboard;
