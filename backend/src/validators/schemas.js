const { z } = require('zod');
const podsConfig = require('../config/pods.json');

// Extract valid pod names from config
const validPodNames = podsConfig.pods.map(pod => pod.pod_name);

// Auth Schemas
const loginSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(1, 'Password is required')
}).refine(
    (data) => data.email || data.username,
    { message: 'Email or username is required' }
);

const signupSchema = z.object({
    email: z.string().email('Invalid email format'),
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
    pod_name: z.string().refine(val => !val || validPodNames.includes(val), {
        message: `pod_name must be one of: ${validPodNames.join(', ')}`
    }).optional()
});

const updateProfileSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    name: z.string().min(1, 'Name cannot be empty').optional()
});

// Request Schemas
const submitRequestSchema = z.object({
    db_type: z.enum(['POSTGRESQL', 'MONGODB'], {
        errorMap: () => ({ message: 'db_type must be POSTGRESQL or MONGODB' })
    }),
    instance_name: z.string().min(1, 'instance_name is required'),
    database_name: z.string().min(1, 'database_name is required'),
    submission_type: z.enum(['QUERY', 'SCRIPT'], {
        errorMap: () => ({ message: 'submission_type must be QUERY or SCRIPT' })
    }),
    query_content: z.string().optional(),
    comments: z.string().optional(),
    pod_name: z.string().refine(val => !val || validPodNames.includes(val), {
        message: `pod_name must be one of: ${validPodNames.join(', ')}`
    }).optional()
}).refine(
    (data) => data.submission_type !== 'QUERY' || (data.query_content && data.query_content.trim().length > 0),
    { message: 'Query content is required for QUERY submission', path: ['query_content'] }
);

const updateRequestSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
        errorMap: () => ({ message: 'Invalid status. Only APPROVED or REJECTED allowed.' })
    }),
    rejection_reason: z.string().optional()
});

// Query Params Schemas
const paginationSchema = z.object({
    page: z.string().regex(/^[1-9]\d*$/, 'page must be a positive integer').optional().default('1'),
    limit: z.string()
        .regex(/^[1-9]\d*$/, 'limit must be a positive integer')
        .refine(val => parseInt(val) <= 100, 'limit cannot exceed 100')
        .optional()
        .default('10')
});

const requestFiltersSchema = paginationSchema.extend({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED']).optional(),
    pod_name: z.string().refine(val => !val || validPodNames.includes(val)).optional(),
    db_type: z.enum(['POSTGRESQL', 'MONGODB']).optional(),
    submission_type: z.enum(['QUERY', 'SCRIPT']).optional(),
    database_name: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    search: z.string().optional(),
    requester_id: z.string().optional(),
    approver_id: z.string().optional()
});

module.exports = {
    loginSchema,
    signupSchema,
    updateProfileSchema,
    submitRequestSchema,
    updateRequestSchema,
    paginationSchema,
    requestFiltersSchema,
    validPodNames
};
