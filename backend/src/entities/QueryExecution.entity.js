const { EntitySchema } = require('@mikro-orm/core');

const ExecutionStatus = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE'
};

class QueryExecution {
    constructor() {
        this.id = undefined;
        this.request = undefined;
        this.query_request_id = undefined;
        this.status = undefined;
        this.result_data = undefined;
        this.error_message = undefined;
        this.executed_at = new Date();
        this.created_at = new Date();
        this.updated_at = new Date();
    }
}

const QueryExecutionSchema = new EntitySchema({
    class: QueryExecution,
    tableName: 'query_executions',
    properties: {
        id: { type: 'number', primary: true, autoincrement: true },
        request: { kind: 'm:1', entity: () => require('./QueryRequest.entity').QueryRequest, fieldName: 'query_request_id' },
        status: { type: 'string', enum: true, items: () => Object.values(ExecutionStatus) },
        result_data: { type: 'text', nullable: true },
        error_message: { type: 'text', nullable: true },
        executed_at: { type: 'Date', onCreate: () => new Date() },
        created_at: { type: 'Date', onCreate: () => new Date() },
        updated_at: { type: 'Date', onCreate: () => new Date(), onUpdate: () => new Date() }
    }
});

module.exports = { QueryExecution, QueryExecutionSchema, ExecutionStatus };
