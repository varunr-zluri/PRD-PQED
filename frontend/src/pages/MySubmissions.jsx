import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMySubmissions, getPods } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import RequestDetailModal from '../components/RequestDetailModal';
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
                updated.start_date = '2020-10-01'; // Reasonable earliest date
            }
            // Validate: start_date cannot be after end_date
            if (name === 'start_date' && value && updated.end_date && value > updated.end_date) {
                updated.end_date = value; // Auto-correct: set end_date to start_date
                toast.warning('Start date cannot be after end date. End date adjusted.');
            }
            if (name === 'end_date' && value && updated.start_date && value < updated.start_date) {
                updated.start_date = value; // Auto-correct: set start_date to end_date
                toast.warning('End date cannot be before start date. Start date adjusted.');
            }
            return updated;
        });
    };

    const RETENTION_DAYS = 30;

    const isScriptExpired = (createdAt) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        return diffDays > RETENTION_DAYS;
    };

    const handleClone = (request) => {
        // For scripts: block failed/rejected, check expiration for others
        if (request.submission_type === 'SCRIPT') {
            if (request.status === 'FAILED' || request.status === 'REJECTED') {
                toast.warning('Failed or rejected scripts cannot be cloned.');
                return;
            }
            if (isScriptExpired(request.created_at)) {
                toast.warning('This script has expired and is no longer available for cloning. Scripts are retained for 30 days.');
                return;
            }
        }

        // Navigate to submit page with pre-filled data
        sessionStorage.setItem('cloneRequest', JSON.stringify({
            instance_name: request.instance_name,
            database_name: request.database_name,
            submission_type: request.submission_type,
            query_content: request.query_content,
            comments: request.comments,
            pod_name: request.pod_name,
            script_path: request.script_path // Include original script URL for reuse
        }));
        navigate('/submit');
        toast.info(request.submission_type === 'QUERY'
            ? 'Query cloned. You can modify and resubmit.'
            : 'Script cloned. The original script will be reused, or upload a new one.');
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
                            <option key={pod.pod_name} value={pod.pod_name}>{pod.display_name || pod.pod_name}</option>
                        ))}
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
                                                <div className="query-preview" onClick={() => setSelectedRequestId(req.id)}>
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
                                                    onClick={() => setSelectedRequestId(req.id)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {/* Allow clone for: all queries, non-failed/rejected scripts */}
                                                {(req.submission_type === 'QUERY' || (req.status !== 'FAILED' && req.status !== 'REJECTED')) && (
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

            {/* Request Detail Modal (view only, no actions for developers) */}
            <RequestDetailModal
                requestId={selectedRequestId}
                isOpen={!!selectedRequestId}
                onClose={() => setSelectedRequestId(null)}
                showActions={false}
            />
        </div>
    );
};

export default MySubmissions;
