import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // Backend prefix is /api
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and redirect to login if 401
            localStorage.removeItem('token');
            // window.location.href = '/login'; // Optional: Redirect
        }
        return Promise.reject(error);
    }
);

// ============ Database & Instance APIs ============

// Get all database instances
export const getInstances = async () => {
    const response = await api.get('/database-instances');
    return response.data;
};

// Get databases for a specific instance
export const getDatabases = async (instanceName) => {
    const response = await api.get('/database-instances', { params: { instance: instanceName } });
    return response.data.databases;
};

// ============ POD APIs ============

// Get all PODs
export const getPods = async () => {
    const response = await api.get('/pods');
    return response.data;
};

// ============ Request APIs ============

// Submit a new request (query or script)
export const submitRequest = async (formData) => {
    const response = await api.post('/requests', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// Get requests (approval queue - for managers)
export const getRequests = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            params.append(key, value);
        }
    });
    const response = await api.get(`/requests?${params.toString()}`);
    return response.data;
};

// Get user's own submissions (history)
export const getMySubmissions = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            params.append(key, value);
        }
    });
    const response = await api.get(`/requests/my-submissions?${params.toString()}`);
    return response.data;
};

// Get single request by ID
export const getRequestById = async (id) => {
    const response = await api.get(`/requests/${id}`);
    return response.data;
};

// Approve a request
export const approveRequest = async (id) => {
    const response = await api.put(`/requests/${id}`, { status: 'APPROVED' });
    return response.data;
};

// Reject a request
export const rejectRequest = async (id, rejectionReason = '') => {
    const response = await api.put(`/requests/${id}`, {
        status: 'REJECTED',
        rejection_reason: rejectionReason
    });
    return response.data;
};

export default api;
