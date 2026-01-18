const { EntitySchema, Collection } = require('@mikro-orm/core');

const DbType = {
    POSTGRESQL: 'POSTGRESQL',
    MONGODB: 'MONGODB'
};

const SubmissionType = {
    QUERY: 'QUERY',
    SCRIPT: 'SCRIPT'
};

const RequestStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    EXECUTED: 'EXECUTED',
    FAILED: 'FAILED'
};

const PodName = {
    POD_1: 'pod-1',
    POD_2: 'pod-2',
    POD_3: 'pod-3',
    SRE: 'sre',
    DE: 'de'
};

class QueryRequest {
    constructor() {
        this.id = undefined;
        this.requester = undefined;
        this.requester_id = undefined;
        this.db_type = undefined;
        this.instance_name = undefined;
        this.database_name = undefined;
        this.submission_type = undefined;
        this.query_content = undefined;
        this.script_path = undefined;
        this.comments = undefined;
        this.pod_name = undefined;
        this.status = RequestStatus.PENDING;
        this.approver = undefined;
        this.approver_id = undefined;
        this.approved_at = undefined;
        this.rejected_reason = undefined;
        this.created_at = new Date();
        this.updated_at = new Date();
        this.executions = new Collection(this);
    }

    // Clean JSON output - exclude internal fields
    toJSON() {
        return {
            id: this.id,
            db_type: this.db_type,
            instance_name: this.instance_name,
            database_name: this.database_name,
            submission_type: this.submission_type,
            query_content: this.query_content,
            comments: this.comments,
            pod_name: this.pod_name,
            status: this.status,
            approved_at: this.approved_at,
            rejected_reason: this.rejected_reason,
            created_at: this.created_at,
            updated_at: this.updated_at,
            // Flatten requester/approver to essential fields
            requester: this.requester ? { id: this.requester.id, name: this.requester.name, email: this.requester.email } : null,
            approver: this.approver ? { id: this.approver.id, name: this.approver.name, email: this.approver.email } : null
        };
    }
}

const QueryRequestSchema = new EntitySchema({
    class: QueryRequest,
    tableName: 'query_requests',
    properties: {
        id: { type: 'number', primary: true, autoincrement: true },
        requester: { kind: 'm:1', entity: () => require('./User.entity').User, fieldName: 'requester_id' },
        db_type: { type: 'string', enum: true, items: () => Object.values(DbType) },
        instance_name: { type: 'string' },
        database_name: { type: 'string' },
        submission_type: { type: 'string', enum: true, items: () => Object.values(SubmissionType) },
        query_content: { type: 'text', nullable: true },
        script_path: { type: 'string', nullable: true },
        comments: { type: 'text', nullable: true },
        pod_name: { type: 'string', enum: true, items: () => Object.values(PodName) },
        status: { type: 'string', enum: true, items: () => Object.values(RequestStatus), default: RequestStatus.PENDING },
        approver: { kind: 'm:1', entity: () => require('./User.entity').User, fieldName: 'approver_id', nullable: true },
        approved_at: { type: 'Date', nullable: true },
        rejected_reason: { type: 'text', nullable: true },
        created_at: { type: 'Date', onCreate: () => new Date() },
        updated_at: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() },
        executions: { kind: '1:m', entity: () => require('./QueryExecution.entity').QueryExecution, mappedBy: 'request' }
    }
});

module.exports = { QueryRequest, QueryRequestSchema, DbType, SubmissionType, RequestStatus, PodName };
