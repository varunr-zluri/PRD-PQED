# Database Query Portal (PRD-PQED)

A secure, role-based portal for developers to submit database queries and scripts for execution against restricted databases. Managers (POD Leads) review requests before execution, ensuring data security and compliance.

## Features

- **Role-Based Access Control (RBAC)**
  - **Developers**: Submit queries/scripts, view submission history
  - **Managers (POD Leads)**: Review, approve, or reject requests for their POD
  - **Admins**: Manage users and database instances

- **Submission Types**
  - **SQL Queries**: Direct execution for PostgreSQL
  - **MongoDB Queries**: JSON-based query execution
  - **Scripts**: Upload and execute JavaScript scripts with isolated worker threads

- **Security & Safety**
  - **Destructive Query Detection**: Automated warnings for `DROP`, `DELETE`, `TRUNCATE`, etc.
  - **Script Isolation**: Scripts run in `worker_threads` with `vm2` sandboxing and strict timeouts
  - **Read-Only Enforcement**: Database connections can be configured for read-only access
  - **Approvals**: Mandatory manager approval for execution

- **Integrations**
  - **Slack Notifications**: Real-time alerts for new requests and status updates
  - **CSV Export**: Download full result sets for large queries
  - **Cloud Storage**: Script files securely stored via Cloudinary

## Tech Stack

- **Frontend**: React, Vite, CSS Modules
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (application data & logs)
- **ORM**: MikroORM
- **Authentication**: JWT, custom RBAC middleware
- **Execution Engine**:
  - PostgreSQL (`pg`)
  - MongoDB (`mongodb`, `mongoose`)
  - Isolated Script Runner (`worker_threads`, `vm2`)

## Project Structure

```
PRD-PQED/
├── backend/
│   ├── src/
│   │   ├── config/             # DB & Cloudinary config
│   │   ├── controllers/        # Request & Auth logic
│   │   ├── entities/           # MikroORM Entities
│   │   ├── middleware/         # Auth, RBAC, Validation
│   │   ├── routes/             # API Routes
│   │   ├── services/           # Executors, Slack, Destructive Detector
│   │   └── utils/              # File upload, Helpers
│   └── tests/                  # Unit & Integration tests
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── contexts/           # Auth Context
│   │   ├── pages/              # Application Pages
│   │   └── api/                # API Client
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL
- MongoDB (optional, for target databases)
- Cloudinary Account (for script uploads)

### Backend Setup
```bash
cd backend
npm install
# Configure .env with DB credentials and Cloudinary keys
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Query Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests` | Submit query/script |
| GET | `/api/requests` | List requests (with filters) |
| GET | `/api/requests/my-submissions` | Get user's submissions |
| GET | `/api/requests/:id` | Get request details |
| PATCH | `/api/requests/:id` | Approve/Reject (Manager) |
| GET | `/api/requests/:id/csv` | Download execution results |

## Security Features
- **Strict Validations**: Zod schemas for all inputs
- **Worker Threads**: Prevents main thread blocking during script execution
- **Input Sanitization**: Prevents basic injection attacks
- **Destructive Operation Warnings**: Alerts managers before approving dangerous queries

## Status: ✅ Production Ready
- [x] Full Authentication & RBAC
- [x] Query & Script Execution Engines
- [x] Approval Workflows
- [x] Slack Integration
- [x] Frontend UI (Dashboard, Approvals, History)
- [x] Security Hardening (Worker Threads, Destructive Checks)
