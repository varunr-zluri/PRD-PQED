const { MikroORM, RequestContext } = require('@mikro-orm/core');
const mikroOrmConfig = require('../../mikro-orm.config');

let orm = null;

/**
 * Initialize MikroORM
 * @returns {Promise<MikroORM>}
 */
const initORM = async () => {
    if (orm) return orm;

    orm = await MikroORM.init(mikroOrmConfig);
    return orm;
};

/**
 * Get the ORM instance
 * @returns {MikroORM}
 */
const getORM = () => {
    if (!orm) {
        throw new Error('ORM not initialized. Call initORM() first.');
    }
    return orm;
};

/**
 * Get the EntityManager
 * @returns {import('@mikro-orm/core').EntityManager}
 */
const getEM = () => {
    return getORM().em;
};

/**
 * Close ORM connection
 */
const closeORM = async () => {
    if (orm) {
        await orm.close();
        orm = null;
    }
};

/**
 * Express middleware to create request-scoped EntityManager
 */
const ormMiddleware = (req, res, next) => {
    RequestContext.create(getORM().em, next);
};

module.exports = {
    initORM,
    getORM,
    getEM,
    closeORM,
    ormMiddleware
};
