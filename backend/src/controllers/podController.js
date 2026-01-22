const podsConfig = require('../config/pods.json');
const { handleError } = require('../utils/errorHandler');

const getPods = async (req, res) => {
    try {
        res.json(podsConfig.pods);
    } catch (error) {
        handleError(error, res);
    }
};

module.exports = {
    getPods
};
