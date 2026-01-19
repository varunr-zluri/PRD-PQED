/**
 * Entity Schema Callback Tests
 * Directly tests the callback functions defined in entity schemas
 */

const { UserSchema } = require('../src/entities/User.entity');
const { QueryRequestSchema } = require('../src/entities/QueryRequest.entity');
const { QueryExecutionSchema } = require('../src/entities/QueryExecution.entity');
const bcrypt = require('bcryptjs');

describe('Entity Schema Callbacks', () => {
    describe('User beforeCreate hook', () => {
        it('should hash password in beforeCreate', async () => {
            const beforeCreateHook = UserSchema.meta.hooks.beforeCreate[0];

            const mockUser = { password: 'testpassword123' };
            const mockArgs = { entity: mockUser };

            await beforeCreateHook(mockArgs);

            expect(mockUser.password).not.toBe('testpassword123');
            expect(mockUser.password.startsWith('$2')).toBe(true);
        });

        it('should not hash if password is undefined', async () => {
            const beforeCreateHook = UserSchema.meta.hooks.beforeCreate[0];

            const mockUser = { password: undefined };
            const mockArgs = { entity: mockUser };

            await beforeCreateHook(mockArgs);

            expect(mockUser.password).toBeUndefined();
        });

        it('should not hash if password is null', async () => {
            const beforeCreateHook = UserSchema.meta.hooks.beforeCreate[0];

            const mockUser = { password: null };
            const mockArgs = { entity: mockUser };

            await beforeCreateHook(mockArgs);

            expect(mockUser.password).toBeNull();
        });
    });

    describe('User beforeUpdate hook', () => {
        it('should hash password in beforeUpdate when password changed', async () => {
            const beforeUpdateHook = UserSchema.meta.hooks.beforeUpdate[0];

            const mockUser = { password: 'newpassword123' };
            const mockArgs = {
                entity: mockUser,
                changeSet: { payload: { password: 'newpassword123' } }
            };

            await beforeUpdateHook(mockArgs);

            expect(mockUser.password).not.toBe('newpassword123');
            expect(mockUser.password.startsWith('$2')).toBe(true);
        });

        it('should not hash if password not in changeSet', async () => {
            const beforeUpdateHook = UserSchema.meta.hooks.beforeUpdate[0];

            const originalHash = await bcrypt.hash('original', 10);
            const mockUser = { password: originalHash };
            const mockArgs = {
                entity: mockUser,
                changeSet: { payload: { name: 'New Name' } }
            };

            await beforeUpdateHook(mockArgs);

            // Password should remain unchanged
            expect(mockUser.password).toBe(originalHash);
        });

        it('should not hash if changeSet is null', async () => {
            const beforeUpdateHook = UserSchema.meta.hooks.beforeUpdate[0];

            const originalHash = await bcrypt.hash('original', 10);
            const mockUser = { password: originalHash };
            const mockArgs = {
                entity: mockUser,
                changeSet: null
            };

            await beforeUpdateHook(mockArgs);

            expect(mockUser.password).toBe(originalHash);
        });

        it('should not hash if changeSet.payload is undefined', async () => {
            const beforeUpdateHook = UserSchema.meta.hooks.beforeUpdate[0];

            const originalHash = await bcrypt.hash('original', 10);
            const mockUser = { password: originalHash };
            const mockArgs = {
                entity: mockUser,
                changeSet: {}
            };

            await beforeUpdateHook(mockArgs);

            expect(mockUser.password).toBe(originalHash);
        });
    });

    describe('QueryRequest schema properties', () => {
        it('should have onCreate callback for created_at', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.created_at.onCreate).toBeDefined();
            expect(typeof props.created_at.onCreate).toBe('function');

            const date = props.created_at.onCreate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have onCreate callback for updated_at', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.updated_at.onCreate).toBeDefined();

            const date = props.updated_at.onCreate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have onUpdate callback for updated_at', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.updated_at.onUpdate).toBeDefined();

            const date = props.updated_at.onUpdate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have enum items function for db_type', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.db_type.items).toBeDefined();

            const items = props.db_type.items();
            expect(items).toContain('POSTGRESQL');
            expect(items).toContain('MONGODB');
        });

        it('should have enum items function for submission_type', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.submission_type.items).toBeDefined();

            const items = props.submission_type.items();
            expect(items).toContain('QUERY');
            expect(items).toContain('SCRIPT');
        });

        it('should have enum items function for status', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.status.items).toBeDefined();

            const items = props.status.items();
            expect(items).toContain('PENDING');
            expect(items).toContain('APPROVED');
            expect(items).toContain('REJECTED');
        });

        it('should have enum items function for pod_name', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.pod_name.items).toBeDefined();

            const items = props.pod_name.items();
            expect(items).toContain('pod-1');
            expect(items).toContain('pod-2');
        });

        it('should have entity function for requester', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.requester.entity).toBeDefined();

            const Entity = props.requester.entity();
            expect(Entity).toBeDefined();
        });

        it('should have entity function for approver', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.approver.entity).toBeDefined();

            const Entity = props.approver.entity();
            expect(Entity).toBeDefined();
        });

        it('should have entity function for executions', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.executions.entity).toBeDefined();

            const Entity = props.executions.entity();
            expect(Entity).toBeDefined();
        });
    });

    describe('QueryExecution schema properties', () => {
        it('should have onCreate callback for executed_at', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props.executed_at.onCreate).toBeDefined();

            const date = props.executed_at.onCreate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have onCreate callback for created_at', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props.created_at.onCreate).toBeDefined();

            const date = props.created_at.onCreate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have onUpdate callback for updated_at', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props.updated_at.onUpdate).toBeDefined();

            const date = props.updated_at.onUpdate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have enum items function for status', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props.status.items).toBeDefined();

            const items = props.status.items();
            expect(items).toContain('SUCCESS');
            expect(items).toContain('FAILURE');
        });

        it('should have entity function for request', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props.request.entity).toBeDefined();

            const Entity = props.request.entity();
            expect(Entity).toBeDefined();
        });
    });

    describe('User schema properties', () => {
        it('should have onCreate callback for created_at', () => {
            const props = UserSchema.meta.properties;
            expect(props.created_at.onCreate).toBeDefined();

            const date = props.created_at.onCreate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have onUpdate callback for updated_at', () => {
            const props = UserSchema.meta.properties;
            expect(props.updated_at.onUpdate).toBeDefined();

            const date = props.updated_at.onUpdate();
            expect(date).toBeInstanceOf(Date);
        });

        it('should have enum items function for role', () => {
            const props = UserSchema.meta.properties;
            expect(props.role.items).toBeDefined();

            const items = props.role.items();
            expect(items).toContain('DEVELOPER');
            expect(items).toContain('MANAGER');
            expect(items).toContain('ADMIN');
        });

        it('should have enum items function for pod_name', () => {
            const props = UserSchema.meta.properties;
            expect(props.pod_name.items).toBeDefined();

            const items = props.pod_name.items();
            expect(items).toContain('pod-1');
            expect(items).toContain('sre');
        });

        it('should have entity function for requests', () => {
            const props = UserSchema.meta.properties;
            expect(props.requests.entity).toBeDefined();

            const Entity = props.requests.entity();
            expect(Entity).toBeDefined();
        });

        it('should have entity function for approvedRequests', () => {
            const props = UserSchema.meta.properties;
            expect(props.approvedRequests.entity).toBeDefined();

            const Entity = props.approvedRequests.entity();
            expect(Entity).toBeDefined();
        });
    });
});
