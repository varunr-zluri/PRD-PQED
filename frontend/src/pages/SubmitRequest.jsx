import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getInstances, getDatabases, getPods, submitRequest } from '../api/client';
import FileUpload from '../components/FileUpload';
import { Send, RotateCcw } from 'lucide-react';

const SubmitRequest = () => {
    const { user } = useAuth();

    // Form state
    const [instances, setInstances] = useState([]);
    const [databases, setDatabases] = useState([]);
    const [pods, setPods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingDatabases, setLoadingDatabases] = useState(false);

    const [formData, setFormData] = useState({
        db_type: '',
        instance_name: '',
        database_name: '',
        submission_type: 'QUERY',
        query_content: '',
        comments: '',
        pod_name: user?.pod_name || ''
    });
    const [scriptFile, setScriptFile] = useState(null);
    const [clonedScriptUrl, setClonedScriptUrl] = useState(null); // For showing original script when cloning

    // Fetch instances on mount and check for clone data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [instanceData, podData] = await Promise.all([
                    getInstances(),
                    getPods()
                ]);
                setInstances(instanceData);
                setPods(podData);

                // Check for cloned request data
                const cloneData = sessionStorage.getItem('cloneRequest');
                if (cloneData) {
                    const parsed = JSON.parse(cloneData);
                    setFormData(prev => ({
                        ...prev,
                        ...parsed
                    }));
                    // Store cloned script URL for reference
                    if (parsed.script_path) {
                        setClonedScriptUrl(parsed.script_path);
                    }
                    sessionStorage.removeItem('cloneRequest');
                }
            } catch (error) {
                toast.error('Failed to load form data');
            }
        };
        fetchData();
    }, []);

    // Fetch databases when instance changes
    useEffect(() => {
        if (formData.instance_name) {
            const fetchDatabases = async () => {
                setLoadingDatabases(true);
                try {
                    const dbs = await getDatabases(formData.instance_name);
                    setDatabases(dbs);
                } catch (error) {
                    toast.error('Failed to load databases');
                    setDatabases([]);
                }
                setLoadingDatabases(false);
            };
            fetchDatabases();
        } else {
            setDatabases([]);
        }
    }, [formData.instance_name]);

    // Update db_type when instance changes
    useEffect(() => {
        if (formData.instance_name) {
            const selectedInstance = instances.find(i => i.name === formData.instance_name);
            if (selectedInstance) {
                setFormData(prev => ({ ...prev, db_type: selectedInstance.type }));
            }
        }
    }, [formData.instance_name, instances]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset dependent fields
            ...(name === 'instance_name' ? { database_name: '' } : {})
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.instance_name || !formData.database_name) {
            toast.error('Please select instance and database');
            return;
        }

        if (formData.submission_type === 'QUERY' && !formData.query_content.trim()) {
            toast.error('Please enter a query');
            return;
        }

        if (formData.submission_type === 'SCRIPT' && !scriptFile) {
            toast.error('Please upload a script file');
            return;
        }

        if (!formData.comments.trim()) {
            toast.error('Please add a comment describing your request');
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('db_type', formData.db_type);
            data.append('instance_name', formData.instance_name);
            data.append('database_name', formData.database_name);
            data.append('submission_type', formData.submission_type);
            data.append('comments', formData.comments);
            data.append('pod_name', formData.pod_name || user?.pod_name);

            if (formData.submission_type === 'QUERY') {
                data.append('query_content', formData.query_content);
            } else {
                data.append('script_file', scriptFile);
            }

            await submitRequest(data);
            toast.success('Request submitted successfully!');
            handleReset();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit request');
        }
        setLoading(false);
    };

    const handleReset = () => {
        setFormData({
            db_type: '',
            instance_name: '',
            database_name: '',
            submission_type: 'QUERY',
            query_content: '',
            comments: '',
            pod_name: user?.pod_name || ''
        });
        setScriptFile(null);
        setClonedScriptUrl(null);
        setDatabases([]);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Query Submission Portal</h1>
                <p className="page-subtitle">Submit database queries or scripts for approval and execution</p>
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: '1', minWidth: '400px' }}>
                    <form onSubmit={handleSubmit} data-testid="request-form">
                        <div className="form-row">
                            <div className="input-group">
                                <label className="label" htmlFor="instance_name">Instance Name *</label>
                                <select
                                    id="instance_name"
                                    name="instance_name"
                                    className="select"
                                    value={formData.instance_name}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Instance</option>
                                    {instances.map(inst => (
                                        <option key={inst.name} value={inst.name}>
                                            {inst.name} ({inst.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label className="label" htmlFor="database_name">Database Name *</label>
                                <select
                                    id="database_name"
                                    name="database_name"
                                    className="select"
                                    value={formData.database_name}
                                    onChange={handleChange}
                                    disabled={!formData.instance_name || loadingDatabases}
                                    required
                                >
                                    <option value="">
                                        {loadingDatabases ? 'Loading...' : 'Select Database'}
                                    </option>
                                    {databases.map(db => (
                                        <option key={db} value={db}>{db}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label" htmlFor="comments">Comments *</label>
                            <textarea
                                id="comments"
                                name="comments"
                                className="textarea"
                                placeholder="Describe the purpose of this query..."
                                value={formData.comments}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="label">Submission Type *</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="submission_type"
                                        value="QUERY"
                                        checked={formData.submission_type === 'QUERY'}
                                        onChange={handleChange}
                                    />
                                    Query
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="submission_type"
                                        value="SCRIPT"
                                        checked={formData.submission_type === 'SCRIPT'}
                                        onChange={handleChange}
                                    />
                                    Script
                                </label>
                            </div>
                        </div>

                        {formData.submission_type === 'QUERY' ? (
                            <div className="input-group">
                                <label className="label" htmlFor="query_content">SQL/MongoDB Query *</label>
                                <textarea
                                    id="query_content"
                                    name="query_content"
                                    className="textarea"
                                    style={{ fontFamily: 'Monaco, Menlo, monospace', minHeight: '150px' }}
                                    placeholder={formData.db_type === 'MONGODB'
                                        ? 'db.collection.find({...})'
                                        : 'SELECT * FROM table_name WHERE ...'}
                                    value={formData.query_content}
                                    onChange={handleChange}
                                />
                            </div>
                        ) : (
                            <div className="input-group">
                                <label className="label">Upload Script *</label>
                                {clonedScriptUrl && !scriptFile && (
                                    <div style={{
                                        padding: '12px',
                                        marginBottom: '12px',
                                        backgroundColor: '#f0f9ff',
                                        border: '1px solid #0ea5e9',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <span style={{ color: '#0369a1', fontSize: '0.9rem' }}>
                                            📄 Cloned from previous script:
                                        </span>
                                        <a
                                            href={clonedScriptUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#0ea5e9', fontWeight: 500 }}
                                        >
                                            Download Original
                                        </a>
                                    </div>
                                )}
                                <FileUpload
                                    file={scriptFile}
                                    onFileSelect={(file) => {
                                        setScriptFile(file);
                                        setClonedScriptUrl(null); // Clear reference when new file is selected
                                    }}
                                    onClear={() => setScriptFile(null)}
                                />
                                <p className="text-sm text-gray" style={{ marginTop: '8px' }}>
                                    {clonedScriptUrl && !scriptFile
                                        ? 'Upload a new script or modify the original and re-upload.'
                                        : 'Scripts run in a sandboxed environment. See example code →'}
                                </p>
                            </div>
                        )}

                        {pods.length > 0 && (
                            <div className="input-group">
                                <label className="label" htmlFor="pod_name">POD Name</label>
                                <select
                                    id="pod_name"
                                    name="pod_name"
                                    className="select"
                                    value={formData.pod_name}
                                    onChange={handleChange}
                                >
                                    {pods.map(pod => (
                                        <option key={pod.pod_name} value={pod.pod_name}>{pod.display_name || pod.pod_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner" /> Submitting...</>
                                ) : (
                                    <><Send size={18} /> Submit Request</>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleReset}
                                disabled={loading}
                            >
                                <RotateCcw size={18} /> Reset
                            </button>
                        </div>
                    </form>
                </div>

                {/* Documentation Sidebar - Only for Scripts */}
                {formData.submission_type === 'SCRIPT' && (
                    <div className="card" style={{ width: '400px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <RotateCcw size={20} className="text-primary" /> {/* Reuse icon as placeholder */}
                            Node.js Scripts (.js)
                        </h3>

                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Environment Variables:</h4>
                            <ul style={{ fontSize: '0.85rem', paddingLeft: '20px', color: '#475569' }}>
                                <li style={{ marginBottom: '4px' }}>
                                    <code>process.env.DB_CONFIG</code>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>Postgres Config (JSON string)</span>
                                </li>
                                <li>
                                    <code>process.env.MONGO_URI</code>
                                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>MongoDB Connection String</span>
                                </li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>PostgreSQL Template:</h4>
                            <pre style={{
                                background: '#1e293b',
                                color: '#e2e8f0',
                                padding: '12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                overflowX: 'auto',
                                border: '1px solid #334155'
                            }}>
                                {`const { Client } = require('pg');

async function run() {
  // 1. Load config
  const config = JSON.parse(process.env.DB_CONFIG);
  const client = new Client(config);

  try {
    await client.connect();
    
    // 2. Execute query
    const result = await client.query(
      'SELECT * FROM users LIMIT 10'
    );
    
    // 3. Return results (Array)
    return result.rows;
  } finally {
    await client.end();
  }
}

return run();`}
                            </pre>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>MongoDB Template:</h4>
                            <pre style={{
                                background: '#1e293b',
                                color: '#e2e8f0',
                                padding: '12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                overflowX: 'auto',
                                border: '1px solid #334155'
                            }}>
                                {`const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Execute query
    const docs = await db.collection('users')
      .find({})
      .limit(10)
      .toArray();
      
    // Return results (Array)
    return docs;
  } finally {
    await client.close();
  }
}

return run();`}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmitRequest;
