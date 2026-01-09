const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const auth = require('../middleware/auth');
const upload = require('../utils/fileUpload');
const { requireRole } = require('../middleware/rbac');

router.post('/', auth, upload.single('script_file'), requestController.submitRequest);
router.get('/', auth, requestController.getRequests);
router.get('/my-submissions', auth, requestController.getMySubmissions);
router.get('/:id', auth, requestController.getRequestById);

// Manager only routes
router.put('/:id', auth, requireRole('MANAGER'), requestController.updateRequest);
router.post('/:id/approve', auth, requireRole('MANAGER'), requestController.approveRequest);
router.post('/:id/reject', auth, requireRole('MANAGER'), requestController.rejectRequest);

module.exports = router;
