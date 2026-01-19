const { EntitySchema } = require('@mikro-orm/core');
const bcrypt = require('bcryptjs');

const PodName = {
    POD_1: 'pod-1',
    POD_2: 'pod-2',
    POD_3: 'pod-3',
    SRE: 'sre',
    DE: 'de'
};

const UserRole = {
    DEVELOPER: 'DEVELOPER',
    MANAGER: 'MANAGER',
    ADMIN: 'ADMIN'
};

class User {
    constructor() {
        this.id = undefined;
        this.email = undefined;
        this.username = undefined;
        this.name = undefined;
        this.password = undefined;
        this.pod_name = undefined;
        this.role = UserRole.DEVELOPER;
        this.created_at = new Date();
        this.updated_at = new Date();
    }

    async checkPassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    toJSON() {

        //const { password, ...rest } = this;
        //return rest;
        // Explicitly return only the fields we want (avoids MikroORM Collection proxy issues)
        return {
            id: this.id,
            email: this.email,
            username: this.username,
            name: this.name,
            pod_name: this.pod_name,
            role: this.role
        };
    }
}

const UserSchema = new EntitySchema({
    class: User,
    tableName: 'users',
    properties: {
        id: { type: 'number', primary: true, autoincrement: true },
        email: { type: 'string', unique: true },
        username: { type: 'string', unique: true, nullable: true },
        name: { type: 'string' },
        password: { type: 'string' },
        pod_name: { type: 'string', enum: true, items: () => Object.values(PodName), nullable: true },
        role: { type: 'string', enum: true, items: () => Object.values(UserRole), default: UserRole.DEVELOPER },
        created_at: { type: 'Date', onCreate: () => new Date() },
        updated_at: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
        requests: { kind: '1:m', entity: () => require('./QueryRequest.entity').QueryRequest, mappedBy: 'requester' },
        approvedRequests: { kind: '1:m', entity: () => require('./QueryRequest.entity').QueryRequest, mappedBy: 'approver' }
    },
    hooks: {
        beforeCreate: [
            async (args) => {
                const user = args.entity;
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            }
        ],
        beforeUpdate: [
            async (args) => {
                const user = args.entity;
                // Only hash if password was changed
                if (args.changeSet?.payload?.password) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
            }
        ]
    }
});

module.exports = { User, UserSchema, PodName, UserRole };
