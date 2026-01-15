/**
 * Middleware to require a specific role
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
    };
};

/**
 * Middleware to restrict MANAGER to their POD only
 * Must be used after auth middleware
 */
const requirePodAccess = (req, res, next) => {
    if (req.user.role === 'MANAGER' && !req.user.pod_name) {
        return res.status(403).json({ error: 'Manager requires Pod assignment' });
    }
    next();
};

/**
 * Middleware that allows ADMIN/MANAGER but not DEVELOPER to access list endpoints
 * MANAGER is restricted to their POD (handled in controller)
 */
const requireListAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'ADMIN') {
        return next();
    }

    if (req.user.role === 'MANAGER') {
        if (!req.user.pod_name) {
            return res.status(403).json({ error: 'Manager requires Pod assignment' });
        }
        return next();
    }

    // DEVELOPER cannot access list of all requests
    return res.status(403).json({ error: 'Access denied. Use /my-submissions to view your requests.' });
};

module.exports = {
    requireRole,
    requirePodAccess,
    requireListAccess
};
