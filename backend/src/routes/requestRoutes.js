const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const csvController = require('../controllers/csvController');
const auth = require('../middleware/auth');
const { handleScriptUpload } = require('../middleware/uploadHandler');
const { requireRole, requireListAccess } = require('../middleware/rbac');
const { validateBody, validateQuery, submitRequestSchema, updateRequestSchema, requestFiltersSchema } = require('../validators');

// Submit request - all authenticated users
router.post('/', auth, handleScriptUpload, validateBody(submitRequestSchema), requestController.submitRequest);

// List all requests - ADMIN (all), MANAGER (their POD only)
router.get('/', auth, requireListAccess, validateQuery(requestFiltersSchema), requestController.getRequests);

// My submissions - all authenticated users (own submissions only)
router.get('/my-submissions', auth, validateQuery(requestFiltersSchema), requestController.getMySubmissions);

// Get by ID - all users, but ownership checked in controller
router.get('/:id', auth, requestController.getRequestById);

// Approve/Reject - MANAGER and ADMIN only (partial update)
router.patch('/:id', auth, requireRole('MANAGER', 'ADMIN'), validateBody(updateRequestSchema), requestController.updateRequest);

// CSV download and execution details
router.get('/:id/csv', auth, csvController.downloadCSV);
router.get('/:id/execution', auth, csvController.getExecutionDetails);

module.exports = router;


