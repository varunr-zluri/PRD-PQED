import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMySubmissions, getPods } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { Search, Copy, Eye, FileText, Inbox } from 'lucide-react';

const MySubmissions = () => {
    const navigate = useNavigate();
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

    const fetchRequests = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await getMySubmissions({ ...filters, page, limit: 10 });
            setRequests(data.requests);
            setPagination({ page: data.page, pages: data.pages, total: data.total });
        } catch (error) {
            toast.error('Failed to load submissions');
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

    const handleClone = (request) => {
        // Navigate to submit page with pre-filled data
        // We'll store the clone data in sessionStorage and handle it in SubmitRequest
        sessionStorage.setItem('cloneRequest', JSON.stringify({
            instance_name: request.instance_name,
            database_name: request.database_name,
            submission_type: request.submission_type,
            query_content: request.query_content,
            comments: request.comments,
            pod_name: request.pod_name
        }));
        navigate('/submit');
        toast.info('Query cloned. You can modify and resubmit.');
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
                <h1 className="page-title">My Submissions</h1>
                <p className="page-subtitle">View and track your query submission history</p>
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
                        <span>Loading submissions...</span>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state">
                        <Inbox size={48} className="empty-state-icon" />
                        <p>No submissions found</p>
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
                                        <td>{req.pod_name}</td>
                                        <td><StatusBadge status={req.status} /></td>
                                        <td className="text-sm">{formatDate(req.created_at)}</td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="btn btn-icon btn-secondary"
                                                    title="View Details"
                                                    onClick={() => setSelectedRequest(req)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {req.submission_type === 'QUERY' && (
                                                    <button
                                                        className="btn btn-icon btn-primary"
                                                        title="Clone & Resubmit"
                                                        onClick={() => handleClone(req)}
                                                    >
                                                        <Copy size={16} />
                                                    </button>
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
                isOpen={!!selectedRequest}
                onClose={() => setSelectedRequest(null)}
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
                            <strong>POD:</strong> {selectedRequest.pod_name}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Status:</strong> <StatusBadge status={selectedRequest.status} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Submitted:</strong> {formatDate(selectedRequest.created_at)}
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Comments:</strong>
                            <p style={{ margin: '8px 0', color: 'var(--text-secondary)' }}>{selectedRequest.comments}</p>
                        </div>
                        {selectedRequest.query_content && (
                            <div style={{ marginBottom: '16px' }}>
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
                        {selectedRequest.status === 'REJECTED' && selectedRequest.rejected_reason && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: '#fee2e2',
                                borderRadius: '6px',
                                color: '#991b1b'
                            }}>
                                <strong>Rejection Reason:</strong>
                                <p style={{ margin: '8px 0 0' }}>{selectedRequest.rejected_reason}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MySubmissions;
