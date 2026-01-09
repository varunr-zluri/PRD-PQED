const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
    };
};

const requirePodAccess = async (req, res, next) => {
    // This middleware assumes the request ID is in params and we've fetched the request
    // OR it checks if the user's POD matches the target resource POD.
    // Since we might not have fetched the request yet, let's just check the user role strictly here
    // and let the controller handle specific resource ownership if needed, OR fetch here.

    // For simplicity, let's just enforce that Managers must have a pod_name.
    if (req.user.role === 'MANAGER' && !req.user.pod_name) {
        return res.status(403).json({ error: 'Manager requires Pod assignment' });
    }
    next();
};

module.exports = {
    requireRole,
    requirePodAccess
};
