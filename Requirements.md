---

## Overview

A web portal enabling developers to submit database queries and scripts for execution against production databases, with a manager approval workflow and Slack notifications.

---

## Problem Statement

Developers need a controlled, auditable way to run ad-hoc queries and scripts against production databases (PostgreSQL, MongoDB) without direct database access. The current process lacks visibility, approval tracking, and notification mechanisms.

---

## Goals

1. Provide a self-service portal for submitting database queries and scripts
2. Enforce manager approval before execution
3. Maintain audit trail of all requests and executions
4. Notify stakeholders via Slack at each workflow step
5. Execute approved queries safely and return results

---

## User Roles

| Role | Description |
| --- | --- |
| **Developer** | Submits queries/scripts, views their submission history |
| **Manager** | Approves/rejects queries for their POD members |
| **Admin** | Manages database instances, POD configurations |

---

## Functional Requirements

### FR1: Authentication

- **FR1.1**: Custom username/password authentication
- **FR1.2**: Session management with secure tokens
- **FR1.3**: User profile contains: email, name, POD membership

### FR2: Query Submission (Developer View)

- **FR2.1**: Form fields:
    
    ![Screenshot 2026-01-05 at 21.19.59.png](attachment:39f8194f-6b63-46f0-801a-7dbdd0727964:Screenshot_2026-01-05_at_21.19.59.png)
    
- **FR2.2**: Submit button sends request to approval queue
- **FR2.3**: Cancel button clears the form
- **FR2.4**: On submit success:
    - Store request in database with status “PENDING”
    - Send Slack notification to common approval channel with request details

### FR3: Approval Dashboard (Manager View)

- **FR3.1**: Display table of pending requests with columns:
    - Database (instance name)
    - Request ID
    - Query/Script content (truncated with expand option)
    - Requester (user email)
    - POD Name
    - Approver assignment
    - Comments
    - Actions (Approve/Reject buttons)
- **FR3.2**: Filter by:
    - Approver name
    - POD name
    - Status
    - Date range
- **FR3.3**: Managers see ONLY requests for their assigned PODs
- **FR3.4**: Search functionality across all visible fields

### FR4: Approval Actions

- **FR4.1**: **Approve**:
    - Update request status to “APPROVED”
    - Trigger query/script execution
    - On execution complete:
        - Send Slack message to requester (DM) with results
        - Send Slack message to approval channel with results
    - On execution failure:
        - Send error details to both requester and approval channel
- **FR4.2**: **Reject**:
    - Update request status to “REJECTED”
    - Prompt manager for rejection reason (optional)
    - Send Slack DM to requester with:
        - Rejection notification
        - Original query/script details
        - Rejection reason (if provided)

### FR5: Query/Script Execution

- **FR5.1**: **Query Execution (PostgreSQL)**:
    - Connect to selected instance/database
    - Execute raw SQL query
    - Return result set as formatted output
- **FR5.2**: **Query Execution (MongoDB)**:
    - Connect to selected instance/database
    - Execute MongoDB query/command
    - Return result documents as JSON
- **FR5.3**: **Script Execution (JavaScript)**:
    - Sandboxed Node.js environment
    - Auto-inject database connections as environment variables:
        - `DB_CONFIG_FILE` - PostgreSQL config JSON path
        - `MONGO_URI` - MongoDB connection string
    - Capture stdout/stderr as execution output
    - Return script output as result

### FR6: Slack Integration

| Event | Channel Type | Message Content |
| --- | --- | --- |
| New submission | Common channel | Request ID, requester, database, query preview, POD |
| Approval + Success | Common channel + Requester DM | Request ID, execution results (truncated if large) |
| Approval + Failure | Common channel + Requester DM | Request ID, error message, stack trace |
| Rejection | Requester DM only | Request ID, query details, rejection reason |

### FR7: Developer History View

- **FR7.1**: List of all submissions by the logged-in user
- **FR7.2**: Display status, submission date, result preview
- **FR7.3**: Ability to re-submit a previous query (clone to new submission)

---

## Non-Functional Requirements

| Requirement | Specification |
| --- | --- |
| **Response Time** | Page load < 2s, Query submission < 1s |

---

## UI Wireframes

### Screen 1: Login Page

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                      ┌─────────────┐                         │
│                      │    LOGO     │                         │
│                      └─────────────┘                         │
│                                                              │
│                   Database Query Portal                      │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │ Email                      │                  │
│              └────────────────────────────┘                  │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │ Password                   │                  │
│              └────────────────────────────┘                  │
│                                                              │
│              ┌────────────────────────────┐                  │
│              │         LOGIN              │                  │
│              └────────────────────────────┘                  │
│                                                              │
│              [Error message appears here]                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Screen 2: Query Submission Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐                                          Logged in: user@zluri.com  │
│ │ LOGO │                                                                     │
├──────────┬───────────────────────────────────────────────────────────────────┤
│          │                                                                   │
│ Dashboard│         Zluri SRE Internal Portal                                 │
│  ────────│                                                                   │
│          │  ┌─────────────────────────────────────────────────────────────┐  │
│ Approval │  │                                                             │  │
│ Dashboard│  │  Database Type *                                            │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │ Select Type (PostgreSQL/MongoDB)  ▼ │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  Instance Name *                                            │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │ Select Instance                   ▼ │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  Database Name *                                            │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │ Select Database                   ▼ │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  Submission Type *                                          │  │
│          │  │  ○ Query   ○ Script                                         │  │
│          │  │                                                             │  │
│          │  │  Query *  (shown if Query selected)                         │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │                                     │                    │  │
│          │  │  │  Enter SQL or MongoDB query...      │                    │  │
│          │  │  │                                     │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  Upload Script * (shown if Script selected)                 │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │         Click to upload or drag     │                    │  │
│          │  │  │        and drop .js file            │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  Comments *                                                 │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │ Describe what this query does...    │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  POD Name *                                                 │  │
│          │  │  ┌─────────────────────────────────────┐                    │  │
│          │  │  │ Select POD                        ▼ │                    │  │
│          │  │  └─────────────────────────────────────┘                    │  │
│          │  │                                                             │  │
│          │  │  ┌──────────────┐  ┌──────────────┐                         │  │
│          │  │  │   SUBMIT     │  │   CANCEL     │                         │  │
│          │  │  └──────────────┘  └──────────────┘                         │  │
│          │  │                                                             │  │
│          │  └─────────────────────────────────────────────────────────────┘  │
│          │                                                                   │
└──────────┴───────────────────────────────────────────────────────────────────┘
```

### Screen 3: Script Submission with Documentation Panel

![Screenshot 2026-01-05 at 21.24.34.png](attachment:a3366ff9-6b2d-4279-b24a-a79194cb9ed4:Screenshot_2026-01-05_at_21.24.34.png)

### Screen 4: Approval Dashboard

![Screenshot 2026-01-05 at 21.24.59.png](attachment:831070de-e173-4452-8b70-98c22df737b5:Screenshot_2026-01-05_at_21.24.59.png)

### Screen 5: My Submissions (Developer History)

---

![Screenshot 2026-01-05 at 21.25.14.png](attachment:f2512b9c-dd17-4970-851b-dfcc5103edc3:Screenshot_2026-01-05_at_21.25.14.png)

## Workflow Diagrams

### Query Submission Flow

```
Developer → Fills Form → Submit
    ↓
Request stored (status: PENDING)
    ↓
Slack notification → Common Approval Channel
    ↓
Manager sees in Approval Dashboard
```

### Approval Flow

```
Manager clicks Approve
    ↓
Status → APPROVED
    ↓
Execute Query/Script
    ↓
    ├── Success → Status: EXECUTED
    │   ├── Slack DM → Requester (results)
    │   └── Slack → Approval Channel (results)
    │
    └── Failure → Status: FAILED
        ├── Slack DM → Requester (error)
        └── Slack → Approval Channel (error)
```

### Rejection Flow

```
Manager clicks Reject → Optional reason prompt
    ↓
Status → REJECTED
    ↓
Slack DM → Requester (rejection + query details + reason)
```

---

## Milestones

### Week 1 - Backend & Core APIs

**Deliverables:**

- Setup PostgreSQL database for portal data
- Setup the backend repo with Node.js/Express.js
- Implement all REST APIs for:
    - Authentication
    - Database instances and PODs listing
    - Query request submission, listing, and details
    - Approve and Reject workflows
- Query/Script Execution Engine:
    - PostgreSQL query execution
    - MongoDB query execution
    - JavaScript script execution (sandboxed)
- Unit Testing (Backend):
    - Setup Jest framework
    - Write unit tests for all API endpoints
    - Write unit tests for execution engine
    - **Target: 100% branch coverage**

**End of Week 1:** Demo to showcase APIs, execution engine, and unit test coverage

---

### Week 2 - Frontend, Slack Integration & Testing

**Deliverables:**

- Publicly accessible link for Frontend application
- Implement all UI screens:
    - Login Page
    - Query Submission Dashboard (with cascading dropdowns)
    - Script Submission with Documentation Panel
    - Approval Dashboard (with filters, search, pagination)
    - My Submissions (with status and clone functionality)
- Slack Integration:
    - New submission notifications to approval channel
    - Approval/Rejection notifications (DM to requester)
    - Execution result notifications (success/failure)
- Unit Testing (Frontend):
    - Setup Jest + React Testing Library
    - Write unit tests for all components
    - Write unit tests for form validation
    - **Target: 100% branch coverage**

**End of Week 2:** Demo to showcase fully functional application with Slack integration

---

### End of Week 2 → Bug Bash

- Cross-team testing to identify edge cases and bugs
- Validate all workflows end-to-end
- Security review of credential handling

---

## Evaluation Criteria

**Total Points: 300**

### Quality (200 points)

**Unit Testing: Branch Coverage (100 Points)**
- 100% branch coverage = 100 points
- Proportional scoring (e.g., 70% coverage = 70 points)

**Bug Bash Score (100 Points)**
- Points earned for finding bugs in others’ applications
- Points deducted for bugs found in your application

### Code Hygiene (50 points)

- Good variable and function naming conventions
- Single responsibility principle for functions
- Code is easy to follow and well-structured
- Proper error handling throughout
- No hardcoded credentials or secrets
- Feedback provided by mentor/buddy

### User Experience (50 points)

- Seamless application flow
- Proper loading states and error messages
- Intuitive form validation feedback
- Clean and consistent UI design

---

## POD Configuration (Static Config File)

```json
{
  "pods": [
    {
      "id": "pod-1",
      "name": "Pod 1",
      "manager_email": "manager1@zluri.com"
    },
    {
      "id": "de",
      "name": "DE",
      "manager_email": "de-lead@zluri.com"
    },
    {
      "id": "db",
      "name": "DB",
      "manager_email": "db-admin@zluri.com"
    }
  ]
}
```

---

## Appendix: Slack Message Templates

**New Submission:**

```
:database: *New Query Request*
*ID:* #123
*Requester:* developer@zluri.com
*Database:* Zluri-ProdDB (MongoDB)
*POD:* Pod 1
*Comment:* Cleaning duplicate records
*Query Preview:* `db.users.deleteMany({ status: 'duplicate' })`
```

**Approval + Results:**

```
:white_check_mark: *Query Executed Successfully*
*ID:* #123
*Approved by:* manager@zluri.com
*Result:* 45 documents deleted
```

**Rejection:**

```
:x: *Query Request Rejected*
*ID:* #123
*Rejected by:* manager@zluri.com
*Reason:* Please add WHERE clause to prevent full table scan
*Original Query:* `DELETE FROM users`
```