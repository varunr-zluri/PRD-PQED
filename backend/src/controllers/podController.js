const podsConfig = require('../config/pods.json');

const getPods = async (req, res) => {
    try {
        res.json(podsConfig.pods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getPods
};
