import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getRequestById, approveRequest, rejectRequest, downloadCSV } from '../api/client';
import StatusBadge from './StatusBadge';
import Modal from './Modal';
import { Database, User, Calendar, MessageSquare, FileText, Code, CheckCircle, XCircle, AlertCircle, Download, AlertTriangle } from 'lucide-react';

const RequestDetailModal = ({ requestId, isOpen, onClose, onActionComplete, showActions = false }) => {
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [downloadingCSV, setDownloadingCSV] = useState(false);
    const [scriptContent, setScriptContent] = useState(null);
    const [scriptLoading, setScriptLoading] = useState(false);

    useEffect(() => {
        if (isOpen && requestId) {
            fetchRequest();
        }
        return () => {
            setRequest(null);
            setLoading(true);
            setShowRejectForm(false);
            setRejectionReason('');
        };
    }, [isOpen, requestId]);

    const fetchRequest = async () => {
        setLoading(true);
        setScriptContent(null);
        try {
            const data = await getRequestById(requestId);
            setRequest(data);

            // If it's a script and script_path is a URL, fetch the content
            if (data.submission_type === 'SCRIPT' && data.script_path && data.script_path.startsWith('http')) {
                setScriptLoading(true);
                try {
                    const response = await axios.get(data.script_path);
                    setScriptContent(response.data);
                } catch (err) {
                    console.error('Failed to fetch script content:', err);
                    setScriptContent('// Failed to load script content');
                }
                setScriptLoading(false);
            }
        } catch (error) {
            toast.error('Failed to load request details');
            onClose();
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await approveRequest(requestId);
            toast.success('Request approved and executed');
            onActionComplete?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve request');
        }
        setActionLoading(false);
    };

    const handleReject = async () => {
        setActionLoading(true);
        try {
            await rejectRequest(requestId, rejectionReason);
            toast.success('Request rejected');
            onActionComplete?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject request');
        }
        setActionLoading(false);
    };

    const handleDownloadCSV = async () => {
        setDownloadingCSV(true);
        try {
            await downloadCSV(requestId);
            toast.success('CSV downloaded successfully');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.reason || 'Failed to download CSV';
            toast.error(errorMsg);
        }
        setDownloadingCSV(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getContent = () => {
        if (request.submission_type === 'QUERY') {
            return request.query_content;
        }
        // For scripts, prefer fetched content, fall back to embedded content
        if (scriptLoading) {
            return '// Loading script...';
        }
        return scriptContent || request.script_content || '// Script content not available';
    };

    const getContentLabel = () => {
        return request.submission_type === 'QUERY' ? 'SQL Query' : `Script (${request.script_filename || 'script.js'})`;
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>Request #{requestId}</span>
                    {request && <StatusBadge status={request.status} />}
                </div>
            }
            footer={
                showActions && request?.status === 'PENDING' && !showRejectForm ? (
                    <>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => setShowRejectForm(true)}
                            disabled={actionLoading}
                        >
                            Reject
                        </button>
                        <button
                            className="btn btn-success"
                            onClick={handleApprove}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Approve'}
                        </button>
                    </>
                ) : showRejectForm ? (
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowRejectForm(false)}>
                            Back
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={handleReject}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                        </button>
                    </>
                ) : null
            }
        >
            {loading ? (
                <div className="loading-container">
                    <span className="spinner" />
                    <span>Loading request details...</span>
                </div>
            ) : !request ? (
                <div className="empty-state">
                    <AlertCircle size={48} />
                    <p>Request not found</p>
                </div>
            ) : showRejectForm ? (
                <div>
                    <p style={{ marginBottom: '16px' }}>Please provide a reason for rejection:</p>
                    <textarea
                        className="textarea"
                        placeholder="Enter rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        style={{ width: '100%', minHeight: '100px' }}
                    />
                </div>
            ) : (
                <div className="request-detail">
                    {/* Metadata Grid */}
                    <div className="detail-grid">
                        <div className="detail-item">
                            <Database size={16} />
                            <div>
                                <span className="detail-label">Database</span>
                                <span className="detail-value">{request.instance_name} / {request.database_name}</span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <Code size={16} />
                            <div>
                                <span className="detail-label">Type</span>
                                <span className="detail-value">{request.db_type} • {request.submission_type}</span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <User size={16} />
                            <div>
                                <span className="detail-label">Requester</span>
                                <span className="detail-value">{request.requester?.name || request.requester?.email || '—'}</span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <FileText size={16} />
                            <div>
                                <span className="detail-label">POD</span>
                                <span className="detail-value">{request.pod_name}</span>
                            </div>
                        </div>
                        <div className="detail-item">
                            <Calendar size={16} />
                            <div>
                                <span className="detail-label">Submitted</span>
                                <span className="detail-value">{formatDate(request.created_at)}</span>
                            </div>
                        </div>
                        {request.approver && (
                            <div className="detail-item">
                                <CheckCircle size={16} />
                                <div>
                                    <span className="detail-label">Reviewed By</span>
                                    <span className="detail-value">{request.approver?.name || request.approver?.email}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Comments */}
                    {request.comments && (
                        <div className="detail-section">
                            <div className="detail-section-header">
                                <MessageSquare size={16} />
                                <span>Comments</span>
                            </div>
                            <p className="detail-comments">{request.comments}</p>
                        </div>
                    )}

                    {/* Query/Script Content */}
                    <div className="detail-section">
                        <div className="detail-section-header">
                            <Code size={16} />
                            <span>{getContentLabel()}</span>
                        </div>
                        <pre className="code-block">
                            <code>{getContent() || 'No content available'}</code>
                        </pre>
                    </div>

                    {/* Rejection Reason */}
                    {request.status === 'REJECTED' && request.rejected_reason && (
                        <div className="detail-section detail-section-error">
                            <div className="detail-section-header">
                                <XCircle size={16} />
                                <span>Rejection Reason</span>
                            </div>
                            <p>{request.rejected_reason}</p>
                        </div>
                    )}

                    {/* Execution Results */}
                    {request.executions && request.executions.length > 0 && (
                        <div className="detail-section">
                            <div className="detail-section-header">
                                <CheckCircle size={16} />
                                <span>Execution Results</span>
                            </div>
                            {request.executions.map((exec, index) => (
                                <div key={exec.id || index} className={`execution-result ${exec.status === 'SUCCESS' ? 'success' : 'failure'}`}>
                                    <div className="execution-header">
                                        <StatusBadge status={exec.status} />
                                        <span className="text-sm">{formatDate(exec.executed_at)}</span>
                                    </div>

                                    {/* Truncation Warning */}
                                    {exec.is_truncated && (
                                        <div className="truncation-warning">
                                            <AlertTriangle size={16} />
                                            <span>
                                                Showing 100 of {exec.total_rows} rows.
                                                <button
                                                    className="btn-link"
                                                    onClick={handleDownloadCSV}
                                                    disabled={downloadingCSV}
                                                    style={{ marginLeft: '8px' }}
                                                >
                                                    <Download size={14} />
                                                    {downloadingCSV ? 'Downloading...' : 'Download Full CSV'}
                                                </button>
                                            </span>
                                        </div>
                                    )}

                                    {exec.result_data && (
                                        <pre className="code-block code-block-sm">
                                            <code>{typeof exec.result_data === 'string' ? exec.result_data : JSON.stringify(exec.result_data, null, 2)}</code>
                                        </pre>
                                    )}
                                    {exec.error_message && (
                                        <div className="execution-error">
                                            <AlertCircle size={14} />
                                            <span>{exec.error_message}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default RequestDetailModal;

