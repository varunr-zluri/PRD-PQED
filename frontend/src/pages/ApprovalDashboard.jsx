import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getRequests } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import RequestDetailModal from '../components/RequestDetailModal';
import { Search, FileText, Eye, Inbox } from 'lucide-react';

const ApprovalDashboard = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        submission_type: '',
        search: '',
        start_date: '',
        end_date: ''
    });

    // Modal state
    const [selectedRequestId, setSelectedRequestId] = useState(null);

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



    const today = new Date().toISOString().split('T')[0];

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const updated = { ...prev, [name]: value };
            // Auto-set end_date to today when start_date is set and end_date is empty
            if (name === 'start_date' && value && !prev.end_date) {
                updated.end_date = today;
            }
            // Auto-set start_date to earliest date when end_date is set and start_date is empty
            if (name === 'end_date' && value && !prev.start_date) {
                updated.start_date = '2020-01-01'; // Reasonable earliest date
            }
            return updated;
        });
    };

    const handleActionComplete = () => {
        fetchRequests(pagination.page);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
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
                    <label className="label">Type</label>
                    <select
                        name="submission_type"
                        className="select"
                        value={filters.submission_type}
                        onChange={handleFilterChange}
                        style={{ minWidth: '120px' }}
                    >
                        <option value="">All Types</option>
                        <option value="QUERY">Query</option>
                        <option value="SCRIPT">Script</option>
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
                        max={today}
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
                        max={today}
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
                                                <div className="query-preview" onClick={() => setSelectedRequestId(req.id)}>
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
                                                    onClick={() => setSelectedRequestId(req.id)}
                                                >
                                                    <Eye size={16} />
                                                </button>
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

            {/* Request Detail Modal with Actions */}
            <RequestDetailModal
                requestId={selectedRequestId}
                isOpen={!!selectedRequestId}
                onClose={() => setSelectedRequestId(null)}
                onActionComplete={handleActionComplete}
                showActions={true}
            />
        </div>
    );
};

export default ApprovalDashboard;
