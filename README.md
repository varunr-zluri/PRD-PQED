# Database Query Portal (PRD-PQED)

A secure, role-based portal for developers to submit database queries and scripts for execution against restricted databases. This system provides an approval workflow where managers (POD Leads) review requests before execution, ensuring data security and compliance.

## Features

-   **Role-Based Access Control (RBAC)**:
    -   **Developers**: Submit queries/scripts, view their submission history.
    -   **Managers (POD Leads)**: Review, approve, or reject requests for their specific POD.
    -   **Admins**: Manage users and database instances.
-   **Submission Support**:
    -   **SQL Queries**: Direct SQL execution for Postgres and MongoDB.
    -   **Scripts**: Upload and execute Python/Shell scripts.
-   **Automated Execution**:
    -   Approved queries are executed automatically against the target database.
    -   Results (or errors) are captured and stored.
-   **Audit Trail**: Full history of requests, approvals, and execution results.

## Tech Stack

-   **Backend**: Node.js, Express
-   **Database**: PostgreSQL (for application data)
-   **ORM**: Sequelize
-   **Authentication**: JWT, custom Role-Based middleware
-   **Execution Engine**: Supported adapters for PostgreSQL, MongoDB, and Script execution.

## Project Structure

```
PRD-PQED/
├── backend/            # Node.js Backend
│   ├── src/
│   │   ├── config/     # Configuration (DB, Pods)
│   │   ├── controllers/# Request handling logic
│   │   ├── middleware/ # Auth & RBAC
│   │   ├── models/     # Sequelize Models (User, QueryRequest, QueryExecution)
│   │   ├── routes/     # API Routes
│   │   └── services/   # Business logic & Execution engines
│   └── scripts/        # Utility scripts (e.g., seeding)
└── frontend/           # (Planned) Frontend Application
```

## Setup & Installation

1.  **Prerequisites**: Node.js, PostgreSQL
2.  **Clone the repository**.
3.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    cp .env.example .env  # Configure your credentials
    npm start
    ```
4.  **Frontend Setup**: (Instructions to be added)

## API Documentation

-   **POST /api/auth/login**: Authenticate user.
-   **POST /api/requests**: Submit a new query or script.
-   **GET /api/requests**: List requests (filtered by role/pod).
-   **PUT /api/requests/:id/approve**: Approve and execute a request (Manager only).
-   **PUT /api/requests/:id/reject**: Reject a request (Manager only).

## Recent Changes

-   **Refactored QueryRequest**: Separated large execution results into `QueryExecution` table.
-   **Pod Updates**: Updated Pod configurations to support `POD 1`, `POD 2`, `POD 3`, `SRE`, `DE`.
